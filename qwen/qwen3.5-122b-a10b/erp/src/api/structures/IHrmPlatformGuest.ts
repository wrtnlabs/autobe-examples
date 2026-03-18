import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IHrmPlatformGuest {
  /**
   * Request body for refreshing an expired guest access token using a valid refresh token for the guest actor authentication system.
   */
  export type IRefresh = {
    /**
     * The refresh token issued during guest registration or previous refresh operation, used to authenticate and obtain new JWT tokens without re-entering credentials.
     *
     * @x-autobe-specification JWT refresh token string validated against hrm_platform_guest_sessions table. Must exist, be unexpired, and not revoked. Upon successful validation, the token is rotated (replaced with new token) for security.
     */
    refresh_token: string;
  };

  /**
   * Registration credentials for creating a new guest account. This DTO represents the request body for guest user registration in the HRM platform authentication system. Contains email address for unique identification and authentication, password for secure access, and session context information (href, referrer, ip) for security auditing purposes to track registration origin and prevent abuse.
   */
  export type IJoin = {
    /**
     * Guest email address for authentication and registration. Must be unique across all guest accounts.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from hrm_platform_guests.email column. Unique constraint enforced at database level. Backend validates email format and checks uniqueness before creating guest record.
     */
    email: string & tags.Format<"email">;

    /**
     * Password for guest authentication. Will be hashed using secure password hashing algorithm before storage.
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Plain text password input that is hashed server-side using bcrypt algorithm and stored in hrm_platform_guests.password_hash column. Backend enforces password complexity requirements including minimum length and character variety.
     */
    password: string & tags.Format<"password">;

    /**
     * Origin URL of the registration request. Used for security auditing and tracking registration patterns.
     *
     * @x-autobe-specification Session context field captured for security auditing. Not stored in hrm_platform_guests table. Origin URL of the registration request used for tracking registration patterns and abuse prevention. Stored in hrm_platform_guest_sessions table if session is created.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL of the registration request. Used for security auditing and tracking registration patterns.
     *
     * @x-autobe-specification Session context field captured for security auditing. Not stored in hrm_platform_guests table. Referrer header from registration request used for tracking registration patterns and abuse prevention. Stored in hrm_platform_guest_sessions table if session is created.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address of the registration request. Optional field used for security auditing and abuse prevention.
     *
     * @x-autobe-specification Session context field captured for security auditing. Not stored in hrm_platform_guests table. Client IP address of registration request used for tracking registration patterns and abuse prevention. Optional field - server may capture IP if not provided by client (SSR scenario). Stored in hrm_platform_guest_sessions table if session is created.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };

  /**
   * Authorized response containing guest ID and JWT authentication tokens after successful guest registration or token refresh. This DTO is returned by the /hrmPlatform/auth/guest/join and /hrmPlatform/auth/guest/refresh endpoints, providing the authenticated guest's unique identifier and dual-token structure for API authorization.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the guest account.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from hrm_platform_guests.id. Primary key, UUID format, auto-generated on guest creation.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };
}
