import { tags } from "typia";

export namespace ITodoAppGuestUser {
  /**
   * Request body for guest user account registration.
   *
   * Guestuser registration creates a new authenticated user account from
   * unauthenticated state.
   */
  export type IJoin = {
    /**
     * Email address for guest user registration. Must be unique and follow
     * RFC 5321 format.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain-text password for account security. Must meet strength
     * requirements: minimum 8 characters including uppercase, lowercase,
     * digit, and special character.
     */
    password: string & tags.MinLength<8> & tags.MaxLength<128>;
  };

  /**
   * Request body for guest user token refresh.
   *
   * Submits refresh token to obtain new access token without
   * re-authentication.
   */
  export type IRefresh = {
    /** Valid refresh token for obtaining new access token. */
    refresh_token: string;
  };
}
