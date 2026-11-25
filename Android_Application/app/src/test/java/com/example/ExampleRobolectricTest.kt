package com.example

import android.content.Context
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTextInput
import androidx.test.core.app.ApplicationProvider
import com.example.ui.screens.AuthScreen
import com.example.ui.theme.YojanaTheme
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class ExampleRobolectricTest {

  @get:Rule
  val composeTestRule = createComposeRule()

  @Test
  fun `read string from context`() {
    val context = ApplicationProvider.getApplicationContext<Context>()
    val appName = context.getString(R.string.app_name)
    assertEquals("YojanaSetu", appName)
  }

  @Test
  fun `clicking login shows in progress and stays on auth screen`() {
    composeTestRule.setContent {
      YojanaTheme {
        AuthScreen()
      }
    }

    composeTestRule.onNodeWithTag("login_submit_button").performScrollTo().performClick()
    composeTestRule.onNodeWithTag("in_progress_banner").assertIsDisplayed()
    composeTestRule.onNodeWithTag("auth_screen").assertIsDisplayed()
  }

  @Test
  fun `switching to signup tab and submitting valid form shows in progress`() {
    composeTestRule.setContent {
      YojanaTheme {
        AuthScreen()
      }
    }

    composeTestRule.onNodeWithTag("tab_signup").performClick()
    composeTestRule.onNodeWithTag("signup_name_input").performScrollTo().performTextInput("Test Citizen")
    composeTestRule.onNodeWithTag("signup_email_input").performScrollTo().performTextInput("citizen@example.com")
    composeTestRule.onNodeWithTag("signup_password_input").performScrollTo().performTextInput("Password123")
    composeTestRule.onNodeWithTag("signup_confirm_password_input").performScrollTo().performTextInput("Password123")
    composeTestRule.onNodeWithTag("signup_submit_button").performScrollTo().performClick()

    composeTestRule.onNodeWithTag("in_progress_banner").assertIsDisplayed()
    composeTestRule.onNodeWithTag("auth_screen").assertIsDisplayed()
  }
}
