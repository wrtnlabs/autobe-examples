import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IEconomicPoliticalBoardGuest {
  /**
   * Authentication response containing user identifier and JWT authorization tokens for the Economic/Political Discussion Board system. Returned upon successful registration or token refresh, enabling clients to authenticate subsequent API requests. The access token enables immediate API access with short-lived validity, while the refresh token allows session renewal without re-authentication.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated user.
     *
     * @x-autobe-specification User identifier extracted from JWT claims. JWT token contains User.id as claim which is decoded and included in this response field. Always a valid UUID format matching User table primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;

    /**
     * Indicates whether authentication was successful.
     *
     * @x-autobe-specification Boolean flag indicating authentication success. Always true when authentication flow completes successfully (registration or token refresh). False only in error scenarios which would return error response instead of this DTO.
     */
    authorized: boolean;
  };

  /**
   * Request body for refreshing an access token. Contains the refresh token issued during initial registration that has a longer validity period (typically 7 days). The service validates this token and, if valid, issues a new access token with a shorter expiration (typically 15-30 minutes).
   */
  export type IRefresh = {
    /**
     * The refresh token for obtaining new access tokens.
     *
     * @x-autobe-specification Refresh token JWT string. Validate signature and expiration claim against authentication service token store. Token issued during registration with ~7 day validity per section 35 Token Expiration Policy.
     */
    refresh: string;
  };

  /**
   * Request body for new user registration in the Economic/Political Discussion Board system. Users provide email and password credentials for authentication, a display name that will appear publicly in their profile and in article/comment authorship attribution, and optionally session context information (origin URL, referring page, client IP) for security auditing. Upon successful registration, a new User record and associated Profile record are created, and authentication tokens are returned enabling immediate API access.
   */
  export type IJoin = {
    /**
     * User's email address for authentication and system communication.
     *
     * @x-autobe-specification Direct mapping from User.email. Unique constraint enforced. Email format validated via RFC 5322 regex pattern. Lowercase normalized before storage.
     */
    email: string & tags.Format<"email">;

    /**
     * User's password for authentication. Will be securely hashed before storage.
     *
     * @x-autobe-specification Password field (user-provided) is hashed using bcrypt or argon2 algorithm with cost factor before storing in User.passwordHash. Password strength validation should be applied before hashing (minimum 8 characters, mix of upper/lower/numbers/special).
     */
    password: string & tags.Format<"password">;

    /**
     * Display name for the user's profile. Will be visible to other users.
     *
     * @x-autobe-specification User-provided name is mapped to Profile.displayName. Required field with 1-50 character limit. This value is publicly visible on the user's profile and used in article/comment authorship attribution.
     */
    name: string & tags.MinLength<1> & tags.MaxLength<50>;

    /**
     * The URL from which the registration request originated. Used for audit and security purposes.
     *
     * @x-autobe-specification Session context field captured from HTTP request URL. Used for audit logging and security analysis. Not stored in User or Profile tables. Captured from the registration request origin.
     */
    href: string & tags.Format<"uri">;

    /**
     * The referring page URL that led to registration. Used for audit and security purposes.
     *
     * @x-autobe-specification Session context field captured from HTTP Referrer header. Used for audit logging and security analysis. Not stored in User or Profile tables. May be empty if privacy settings block referrer.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address for security auditing. Captured by the server from the HTTP request context.
     *
     * @x-autobe-specification IP address captured from server-side HTTP request context (X-Forwarded-For header or direct connection IP). Used for audit logging and security analysis. Not stored in User or Profile tables. Optional field because in SSR scenarios the client may not know its own IP.
     */
    ip?: (string & tags.Format<"ipv4">) | null | undefined;
  };
}
