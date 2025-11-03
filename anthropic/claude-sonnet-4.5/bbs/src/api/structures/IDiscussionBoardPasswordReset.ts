import { tags } from "typia";

export namespace IDiscussionBoardPasswordReset {
  /**
   * Password reset request data structure for initiating the password
   * recovery process.
   *
   * This request body is used when a user has forgotten their password and
   * needs to reset it. The user provides their registered email address, and
   * the system generates a secure password reset token and sends instructions
   * via email.
   *
   * The operation implements security measures including rate limiting (one
   * request per 5 minutes per email) and email enumeration protection
   * (identical response whether email exists or not).
   */
  export type IRequest = {
    /**
     * Email address of the account for which password reset is requested.
     *
     * This is the email address registered with the user account. The
     * system will send password reset instructions to this email if an
     * account exists with this address.
     *
     * For security reasons, the system returns the same success message
     * regardless of whether this email exists in the database, preventing
     * email enumeration attacks.
     */
    email: string & tags.Format<"email">;
  };

  /**
   * Response message for password reset request operation.
   *
   * This response confirms that the password reset request was processed. For
   * security reasons, it provides the same success message regardless of
   * whether the email address exists in the system, preventing email
   * enumeration attacks.
   *
   * If an account exists with the provided email, a password reset email with
   * a unique token is sent to that address. The token expires after 2 hours
   * and is single-use only.
   */
  export type IRequestResponse = {
    /**
     * Generic success message indicating that password reset instructions
     * have been sent if an account exists.
     *
     * This message is intentionally vague for security purposes, not
     * revealing whether the provided email address actually exists in the
     * system. The standard message is: 'If an account exists with this
     * email, you will receive password reset instructions.'
     *
     * This prevents malicious actors from using the password reset function
     * to enumerate valid email addresses registered in the system.
     */
    message: string;
  };

  /**
   * Password reset confirmation data structure for completing the password
   * recovery process.
   *
   * This request body is used in the second step of password reset, after the
   * user has received the reset token via email and clicked the reset link.
   * The user provides the token, their desired new password, and password
   * confirmation.
   *
   * Upon successful validation and password update, all existing user
   * sessions are invalidated, forcing the user to log in again from all
   * devices with the new password. This security measure ensures that if an
   * unauthorized party had access to the account, they are immediately logged
   * out when the legitimate owner resets the password.
   */
  export type IConfirm = {
    /**
     * Password reset token received via email.
     *
     * This is the unique, cryptographically secure token that was generated
     * during the password reset request operation and sent to the user's
     * email address. The token must be valid, not expired (2-hour
     * expiration), and not previously used.
     *
     * The token authenticates this password reset request and ensures that
     * only the legitimate account owner who has access to the registered
     * email can reset the password.
     */
    token: string;

    /**
     * New password to set for the user account.
     *
     * This password must meet all security complexity requirements
     * including minimum 8 characters length, at least one uppercase letter
     * (A-Z), at least one lowercase letter (a-z), at least one number
     * (0-9), and at least one special character (e.g., !@#$%^&*).
     *
     * The password is validated against common compromised password
     * databases and rejected if it matches known breached passwords. The
     * system securely hashes this password before storing it in the
     * password_hash field.
     */
    new_password: string & tags.MinLength<8> & tags.Format<"password">;

    /**
     * Confirmation of the new password to prevent typos.
     *
     * This field must exactly match the new_password field. If the values
     * do not match, the system rejects the password reset request and
     * displays an error message.
     *
     * Requiring password confirmation reduces the risk of users
     * accidentally setting a password they didn't intend due to typing
     * errors.
     */
    password_confirmation: string & tags.Format<"password">;
  };

  /**
   * Response confirming successful password reset completion.
   *
   * This response is returned when a user successfully completes the password
   * reset process by validating their reset token and setting a new password.
   * The response confirms that the password has been updated in the
   * discussion_board_members table, all existing sessions have been
   * invalidated, and a confirmation email has been sent.
   *
   * The password reset confirmation response provides essential feedback to
   * users who have completed the account recovery process. It reassures them
   * that their account is now secured with the new password and guides them
   * toward the next step of logging in with their updated credentials.
   *
   * This response marks the successful conclusion of the two-step password
   * recovery flow, which begins with a password reset request that generates
   * and emails a reset token, and concludes with this confirmation operation
   * that validates the token and applies the new password.
   */
  export type IConfirmResponse = {
    /**
     * Success confirmation message indicating the password was successfully
     * reset.
     *
     * This message provides immediate feedback to the user that their
     * password change was completed successfully. The message reassures
     * users that their account is now secured with the new password and
     * prompts them to log in using the updated credentials.
     *
     * Typical message content confirms the password reset completion,
     * informs the user that all existing sessions have been invalidated for
     * security purposes, and directs them to the login page to authenticate
     * with their new password.
     */
    message: string;
  };
}
