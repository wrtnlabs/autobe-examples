import { tags } from "typia";

export namespace IRedditLikeAuthSession {
  /**
   * Session validation request.
   *
   * Contains the access token to validate for session state verification.
   */
  export type IValidate = {
    /** JWT access token to validate. */
    access_token: string;
  };

  /**
   * Session validation result.
   *
   * Indicates whether the token is valid and includes user information if
   * validation succeeds.
   */
  export type IValidationResult = {
    /** Whether the token is valid and session is active. */
    valid: boolean;

    /** User ID from the validated token. */
    user_id?: (string & tags.Format<"uuid">) | undefined;

    /** Username from the validated token. */
    username?: string | undefined;

    /** User role from the validated token. */
    role?: string | undefined;

    /** Token expiration timestamp. */
    expires_at?: (string & tags.Format<"date-time">) | undefined;
  };
}
