import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IEcommerceMallSuperAdministrator {
  /**
   * Request body for refreshing authentication tokens.
   *
   * Submits a valid refresh token that was previously received during login or registration. The system validates the token against the stored session record. If the token is valid and the session has not expired, a new pair of access and refresh tokens will be issued.
   *
   * This operation enables continuous platform access without requiring re-authentication. The refresh token should be stored securely and transmitted only to the refresh endpoint.
   */
  export type IRefresh = {
    /**
     * Refresh token for token renewal.
     *
     * The refresh token is a long-lived authentication credential used to obtain new access tokens without requiring re-login. Must be a valid token associated with an active session for the super administrator.
     *
         * @x-autobe-specification User-provided refresh token string. Must
         *   match a valid session record in
         *   ecommerce_mall_super_administrator_sessions table. Token validated
         *   against stored session for existence and expiration. If valid,
         *   issues new access and refresh tokens.
     */
    refresh_token: string;
  };

  /**
   * Login credentials for authenticating a super administrator account.
   *
   * Provides the email address and password required to authenticate a super administrator on the e-commerce mall platform. The email must match the unique email address associated with the super administrator account in the database. The password is the plain text credential that will be securely hashed and verified against the stored password hash using industry-standard algorithms (bcrypt or argon2).
   */
  export type ILogin = {
    /**
     * The super administrator's unique email address used for authentication.
     *
     * This field serves as the primary account identifier for login. The email must match exactly with the stored value in the database and must be formatted according to RFC 5322 email standards.
     *
         * @x-autobe-database-schema-property email
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_super_administrators.email. Input email is validated
         *   against the unique email constraint in the database. Must be a
         *   valid email format and match an existing super administrator
         *   account.
     */
    email: string & tags.Format<"email">;

    /**
     * The plain text password used to authenticate the super administrator account.
     *
     * The password is transmitted securely over HTTPS and will be hashed using industry-standard algorithms (bcrypt or argon2) before being compared against the stored password hash in the database. Passwords must meet minimum security requirements including length and character diversity.
     *
         * @x-autobe-database-schema-property password_hash
         * @x-autobe-specification Input is plain text password. Backend hashes
         *   using bcrypt or argon2 algorithm before comparing with
         *   ecommerce_mall_super_administrators.password_hash column. Password
         *   must meet security requirements: minimum 8 characters, uppercase,
         *   lowercase, number, and special character.
     */
    password: string & tags.Format<"password">;
  };

  /**
   * Registration request body for creating a new super administrator account on the e-commerce platform.
   *
   * This request body is used when registering a new super administrator account during platform setup or when adding new administrative users. The request must include a unique email address, display name, and plain text password which will be securely hashed before storage. Session context (source URI, referrer, and optional IP address) is captured for security auditing and fraud prevention.
   *
   * Upon successful registration, the platform returns JWT access and refresh tokens for immediate authentication. Super administrators have the highest privilege level, including administrator management, seller oversight, and platform-wide controls.
   *
   * > Note: Password is submitted in plain text and will be hashed by the backend. Email must be unique across all super administrator accounts.
   */
  export type IJoin = {
    /**
     * Unique email address used as the account identifier for authentication.
     *
     * This field must be a valid email format and unique across all super administrator accounts. The email serves as the primary means of identifying the account for login, password recovery, and platform communications. It is required and cannot be modified after account creation.
     *
         * @x-autobe-database-schema-property email
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_super_administrators.email. Required for account
         *   identification and login. Backend validates uniqueness and email
         *   format before storing.
     */
    email: string & tags.Format<"email">;

    /**
     * The name displayed to other users when the super administrator performs actions on the platform.
     *
     * This name appears in administrative action logs, approval/rejection decisions, and seller communications. It serves as the public-facing identity of the super administrator separate from their email address. Required field with a maximum length of 255 characters.
     *
         * @x-autobe-database-schema-property display_name
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_super_administrators.display_name. User-provided
         *   name that appears in administrative action logs and platform
         *   records.
     */
    display_name: string & tags.MinLength<1> & tags.MaxLength<255>;

    /**
     * Plain text password for account authentication.
     *
     * This password is submitted in plain text and will be securely hashed by the backend using a strong hashing algorithm before storage. The original password is never stored. Minimum length is 8 characters. The password is required and must meet security requirements for administrative accounts.
     *
         * @x-autobe-database-schema-property password_hash
         * @x-autobe-specification Plain text password submitted by user.
         *   Backend hashes this value using secure hashing algorithm before
         *   storing to ecommerce_mall_super_administrators.password_hash field.
         *   Minimum 8 characters required.
     */
    password: string & tags.MinLength<8> & tags.Format<"password">;

    /**
     * Source URI of the registration request.
     *
     * Captures the full URL from which the registration was initiated. This information is critical for security auditing, fraud prevention, and tracking where administrative accounts are created. Required field for all registration requests.
     *
         * @x-autobe-specification Session context field capturing the source
         *   URI of the registration request. Captured from HTTP request
         *   headers, not stored in super administrator table. Used for security
         *   auditing and tracking registration origin.
     */
    href: string & tags.Format<"uri">;

    /**
     * HTTP Referrer header value from the registration request.
     *
     * Records the URL of the page that linked to the registration form. This information helps trace the source of registration requests and is used for security auditing and fraud prevention. Required field.
     *
         * @x-autobe-specification Session context field capturing the HTTP
         *   Referrer header value. Captured from request headers, not stored in
         *   super administrator table. Used for security auditing and
         *   traceability.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address for security auditing and fraud detection.
     *
     * Optional field that captures the IP address from which the registration was initiated. In SSR environments, this may be null if the client cannot determine its own IP; the server captures the IP address as a fallback. Used for security auditing, fraud prevention, and login history tracking.
     *
         * @x-autobe-specification Optional IP address captured from the client
         *   connection. Can be null when using SSR (Server Side Rendering)
         *   where client cannot know its own IP. Backend captures server-side
         *   IP as fallback. Used for security auditing and fraud detection.
     */
    ip?: (string & tags.Format<"ipv4">) | null | undefined;
  };

  /**
   * Authentication response containing JWT tokens and super administrator account identification.
   *
   * Returned after successful super administrator login or registration. Contains access and refresh tokens for API authentication, along with the super administrator's unique identifier and profile summary for user context.
   *
   * The tokens are valid for subsequent API requests until expiration. The refresh token allows obtaining new access tokens without re-authentication. The superAdministrator summary includes display_name and email for user identification in the application UI.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated super administrator.
     *
     * The UUID primary key from the super administrator account table, used as the JWT subject claim for token-based authentication.
     *
         * @x-autobe-database-schema-property id
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_super_administrators.id. This is the JWT subject
         *   claim that uniquely identifies the authenticated super
         *   administrator.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Summary representation of the super administrator's profile.
     *
     * Contains the super administrator's display_name and email for user identification in the application UI. This ISummary reference provides essential profile information while maintaining security boundaries by excluding sensitive fields.
     *
         * @x-autobe-specification Reference to
         *   IEcommerceMallSuperAdministrator.ISummary. This nested object
         *   provides the super administrator's display profile including
         *   display_name and email for user identification without exposing
         *   sensitive data.
     */
    superAdministrator: IEcommerceMallSuperAdministrator.ISummary;

    /**
     * Authorization token.
     *
         * @x-autobe-specification Authorization token comes from the session
         *   table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Super administrator account summary optimized for list displays and administrative oversight.
   *
   * This DTO contains essential super administrator identification and status information for paginated lists, admin dashboards, and reference objects in parent entities. It includes the account identifier, display name, email address, and account timestamps.
   *
   * ### Fields
   *
   * - **id**: Unique identifier for the super administrator account
   * - **display_name**: Public-facing name displayed in platform records
   * - **email**: Unique email address used for authentication
   * - **created_at**: Timestamp when the account was created
   * - **updated_at**: Timestamp when the account was last modified
   *
   * ### Optional Fields
   *
   * - **deleted_at**: Soft delete timestamp (null when account is active)
   * - **banned_at**: Ban timestamp when account is suspended from administrative actions
   *
   * ### Security
   *
   * Password hashes are never exposed in summary or response DTOs. Account status is reflected through deleted_at and banned_at fields.
   */
  export type ISummary = {
    /**
     * Unique identifier for the super administrator account.
     *
     * This UUID serves as the primary key and unique identifier for each super administrator in the system. It is used to reference the account in relationships, audit logs, and administrative operations.
     *
         * @x-autobe-database-schema-property id
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_super_administrators.id. UUID format, unique primary
         *   key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Unique email address used as the account identifier for authentication.
     *
     * This email is required and must be unique across all super administrator accounts. It serves as the primary means of identifying the account for login, password recovery, and platform communications.
     *
         * @x-autobe-database-schema-property email
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_super_administrators.email. Unique email address
         *   used for authentication, must be valid email format and unique
         *   across all super administrator accounts.
     */
    email: string & tags.Format<"email">;

    /**
     * The name displayed to other users when the super administrator performs actions on the platform.
     *
     * This name appears in administrative action logs, approval/rejection decisions, and seller communications. It serves as the public-facing identity of the super administrator separate from their email address.
     *
         * @x-autobe-database-schema-property display_name
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_super_administrators.display_name. The public-facing
         *   name displayed to other users when the super administrator performs
         *   actions on the platform.
     */
    display_name: string;

    /**
     * Timestamp when the super administrator account was created.
     *
     * This field records the exact moment the account was registered and becomes effective for platform access. It is set automatically upon account creation and cannot be modified.
     *
         * @x-autobe-database-schema-property created_at
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_super_administrators.created_at. ISO 8601 datetime
         *   format with timezone. Records the exact moment the account was
         *   registered and becomes effective for platform access.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the super administrator account was last updated.
     *
     * This field is updated on every account modification including profile changes, password updates, and status changes. It provides a reliable indicator of recent account activity.
     *
         * @x-autobe-database-schema-property updated_at
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_super_administrators.updated_at. ISO 8601 datetime
         *   format with timezone. Updated on every account modification
         *   including profile changes, password updates, and status changes.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Soft delete timestamp for account removal.
     *
     * When null, the account is active and can authenticate to the platform. When populated, the account is soft-deleted and cannot authenticate but is preserved for audit and compliance purposes. This allows for record preservation without permanent data loss.
     *
         * @x-autobe-database-schema-property deleted_at
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_super_administrators.deleted_at. Nullable ISO 8601
         *   datetime format with timezone. When null, the account is active.
         *   When populated, the account is soft-deleted and preserved for audit
         *   purposes.
     */
    deleted_at?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Timestamp when the super administrator account was banned from performing administrative actions.
     *
     * When set, this indicates the account has been suspended from performing administrative actions due to policy violations or security concerns. The ban can be lifted by setting this field to null (unban). This field is managed by the user ban system and is used for audit trail purposes.
     *
         * @x-autobe-database-schema-property banned_at
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_super_administrators.banned_at. Nullable ISO 8601
         *   datetime format with timezone. When set, indicates the account has
         *   been suspended from performing administrative actions. The ban can
         *   be lifted by setting this field to null (unban).
     */
    banned_at?: (string & tags.Format<"date-time">) | null | undefined;
  };
}
