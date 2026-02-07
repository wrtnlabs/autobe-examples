import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IShoppingMallAdmin {
  /**
   * Authentication credential payload for administrator login. Contains the email address and password used to verify identity against the system's administrative user database.
   */
  export type ILogin = {};

  /**
   * Empty request body type for the admin JWT refresh operation. This type indicates that no request body data is expected; the admin's refresh token is authenticated via the Authorization header. This contract ensures client implementers know that sending a request body is unnecessary and may cause errors.
   */
  export type IRefresh = {};

  /**
   * Response object containing authentication tokens for admin session establishment. Includes a short-lived access token for API requests and a long-lived refresh token for obtaining new access tokens without re-authenticating. Both tokens are base64-encoded JWT strings generated server-side upon successful admin login, join, or refresh.
   */
  export type IAuthorized = {
    /**
     * Short-lived JWT access token for authenticating API requests. Must be included in Authorization header as Bearer token. Expires after 30 minutes and must be refreshed to continue session.
     *
     * @x-autobe-specification JWT access token issued by server upon successful admin authentication. Contains encoded claims: admin ID (sub), role, and expiration (exp). Base64-encoded string. Expires in 30 minutes. Stored in shopping_mall_admin_sessions table as hashed token reference only.
     */
    access: string;

    /**
     * Long-lived refresh token used to obtain new access tokens when the current access token expires. Allows session continuation without requiring user to re-enter credentials. Expires after 30 days.
     *
     * @x-autobe-specification JWT refresh token issued by server upon successful admin authentication. Used to request new access tokens without re-authentication. Expires in 30 days. Stored in shopping_mall_admin_sessions table as hashed token reference only.
     */
    refresh: string;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Request body for registering a new administrator account. Must include a valid email address and a secure password. No other fields are permitted. Email must be unique and conform to RFC 2822 format. Password must be at least 12 characters long and contain at least one uppercase letter, one lowercase letter, one digit, and one special character.
   */
  export type IJoin = {};
}
