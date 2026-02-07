import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoAppUser {
  /**
   * Request to register a new user account using a unique email address and a secure password. The system does not require additional profile information at registration. After successful registration, the user receives authentication tokens but no user data is returned, maintaining strict data privacy. The password must be at least 7 characters long for security.
   */
  export type IJoin = {};

  /**
   * Login request for user authentication, containing email and password. This is a credentials object used exclusively for the authentication process and contains no user data beyond what is needed to validate identity. The password is provided in plaintext for server-side bcrypt comparison and is never stored, logged, or persisted.
   */
  export type ILogin = {};

  /**
   * A cryptographically signed JWT used to obtain a new access token without requiring user credentials. Contains user context (user_id) and expiration claims. Must be valid and unexpired. Used exclusively for refresh operations. No email, password, or other sensitive data is included.
   */
  export type IRefresh = {};

  /**
   * Authentication response containing access and refresh tokens for session management. No user data is returned to maintain strict privacy - the tokens contain all necessary context internally.
   */
  export type IAuthorized = {
    /**
     * Short-lived JWT access token for API authorization. Expires in 15 minutes.
     *
     * @x-autobe-specification Short-lived JWT access token for API authorization. Generated with user_id claim and signed with system secret key. Expires in 15 minutes. Must be included in Authorization header as 'Bearer {access}' for authenticated requests.
     */
    access: string;

    /**
     * Long-lived rotating refresh token used to obtain new access tokens without requiring re-authentication. Expires in 7 days.
     *
     * @x-autobe-specification Long-lived rotating refresh token used to obtain new access tokens without requiring re-authentication. Generated with user_id claim and signed with system secret key. Expires in 7 days. Rotated on each refresh request, invalidating the previous refresh token. Must be stored securely. Only valid with the refresh endpoint.
     */
    refresh: string;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };
}
