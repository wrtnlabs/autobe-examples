import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoListAdmin {
  /**
   * Request body schema for creating a new administrator account in the
   * todo_list_admins table.
   *
   * This object includes unique email and secure password hash fields.
   *
   * All properties are required to register a new administrator.
   *
   * The schema closely follows the Prisma model schema for todo_list_admins.
   *
   * Sensitive fields such as raw passwords are not accepted here for security
   * reasons.
   */
  export type ICreate = {
    /**
     * Unique email address for administrator account registration.
     *
     * The email must be a valid email format and unique across all admin
     * accounts.
     *
     * This is the primary identifier for administrator login and
     * communication.
     */
    email: string & tags.Format<"email">;

    /**
     * Password hash used for secure authentication of the administrator.
     *
     * This must be a hashed string rather than plain text.
     *
     * Clients are expected to provide a hashed password adhering to system
     * security policies.
     *
     * Direct plaintext password submission is handled by separate endpoints
     * or hashing before transmission.
     */
    password_hash: string;
  };

  /**
   * Authorization response containing JWT token and administrator account
   * details.
   *
   * This schema corresponds to the administrator model in the Prisma schema
   * (todo_list_admins).
   *
   * Sensitive password hashes are omitted in responses for security reasons.
   *
   * The deleted_at field indicates soft deletion status, where null means the
   * account is active.
   */
  export type IAuthorized = {
    /** Unique identifier of the authenticated administrator. */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;

    /**
     * Unique email address of the administrator for login and
     * communication.
     */
    email: string;

    /** Timestamp when the administrator account was created. */
    created_at: string & tags.Format<"date-time">;

    /** Timestamp when the administrator account was last updated. */
    updated_at: string & tags.Format<"date-time">;

    /** Soft deletion timestamp; null if the administrator account is active. */
    deleted_at?: (string & tags.Format<"date-time">) | null | undefined;
  };

  /**
   * Login credentials for administrator authentication.
   *
   * This schema includes mandatory email and password fields required to
   * initiate login.
   *
   * Optional fields are provided for enhanced security and session
   * management.
   *
   * The password must be in plain text and will be validated against the
   * stored password hash in the database.
   *
   * Device info is used for advanced login context and is optional.
   *
   * This schema corresponds to login operation for the todo_list_admins table
   * in Prisma schema.
   */
  export type ILogin = {
    /** Email address of the administrator used for login. */
    email: string;

    /** Plain text password for login authentication. */
    password: string;

    /**
     * Optional flag indicating if the session should be persistent beyond
     * default expiration.
     */
    remember_me?: boolean | undefined;

    /** Optional token from CAPTCHA verification to enhance security. */
    captcha_token?: string | undefined;

    /** Optional two-factor authentication code if enabled. */
    two_factor_code?: string | undefined;

    /**
     * Optional information about the device used to facilitate login for
     * security auditing and anomaly detection.
     */
    device_info?:
      | {
          /** Unique identifier for the device used during login. */
          device_id: string;

          /** Human-readable name for the device. */
          device_name?: string | undefined;

          /** Operating system of the device. */
          device_os?: string | undefined;

          /** IPv4 address of the client device logging in. */
          ip_address?: (string & tags.Format<"ipv4">) | undefined;
        }
      | undefined;
  };

  /**
   * Request payload to refresh authentication tokens for administrators.
   * Contains the refresh token string to be validated and exchanged for new
   * access and refresh tokens.
   */
  export type IRefresh = {
    /**
     * Refresh token string used to obtain new JWT tokens for administrator
     * authentication.
     */
    refreshToken: string;
  };
}
