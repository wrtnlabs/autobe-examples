import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IShoppingMallCustomer {
  /**
   * Registration data for a new customer account. This schema corresponds to
   * the shopping_mall_customers table and defines the required fields for
   * customer creation: email and password.
   *
   * The email field must be a valid, unique email address as defined in the
   * shopping_mall_customers schema. The password field contains the plain
   * text password provided by the user. The backend performs bcrypt hashing
   * before storing it in the password_hash field.
   *
   * Both fields are required - the customer cannot be registered without
   * complete credentials. The operation does not accept any other fields such
   * as id, created_at, updated_at, deleted_at, or status as these are managed
   * by the system.
   *
   * The status field is automatically set to 'active' by the system for all
   * new registrations.
   *
   * Session context fields (ip, href, referrer) are REQUIRED in this schema
   * because this is a self-authentication operation (customer registering
   * themselves) and the system must create a session record in the
   * shopping_mall_customer_sessions table with accurate connection metadata.
   */
  export type ICreate = {
    /**
     * Customer's unique email address used for authentication and
     * communication. Must be unique across all customers.
     */
    email: string & tags.Format<"email">;

    /**
     * Customer's password in plain text. The backend will hash this value
     * and store it in the password_hash field of the
     * shopping_mall_customers table. Never send pre-hashed passwords.
     */
    password: string & tags.MinLength<8>;

    /**
     * Client IP address from which the registration request originates.
     *
     * This field is used to create a session record in the
     * shopping_mall_customer_sessions table. The server can extract IP from
     * the HTTP request headers, but providing it in the request body
     * ensures accurate tracking in cases where the backend is behind a
     * proxy or load balancer (SSR scenarios).
     *
     * Format: IPv4 address (e.g., 192.168.1.1)
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;

    /**
     * The URL of the page from which the customer initiated the
     * registration process.
     *
     * This metadata is stored in the shopping_mall_customer_sessions table
     * to create an audit trail of the customer's interaction path. It helps
     * identify registration sources and detect potentially suspicious
     * behavior patterns. The value should be the full URL of the current
     * page.
     *
     * Format: URI (Uniform Resource Identifier)
     */
    href: string & tags.Format<"uri">;

    /**
     * The URL of the previous page from which the customer navigated to the
     * registration page.
     *
     * This metadata is stored in the shopping_mall_customer_sessions table
     * to create an audit trail of the customer's interaction path. It helps
     * identify marketing channels and referral sources. For direct access,
     * this value should be an empty string.
     *
     * Format: URI (Uniform Resource Identifier)
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Account status assigned to the new customer upon registration.
     *
     * This field is managed automatically by the system and should always
     * be set to 'active' for new registrations. Other values (suspended,
     * banned, pending_email_verification, rejected) are not valid for
     * initial registration and will be overridden by the system.
     *
     * Valid values: 'active' (default), 'suspended', 'banned',
     * 'pending_email_verification', 'rejected'
     */
    status?: "active" | "active" | "active" | "active" | "active" | undefined;
  };

  /**
   * Access and refresh tokens upon successful authentication.
   *
   * This schema represents the response from both the login and refresh
   * endpoints and contains the JSON Web Tokens and customer metadata needed
   * for subsequent authenticated requests. It constitutes the credential
   * bundle required for accessing protected API endpoints.
   *
   * The 'id' property represents the customer's unique identifier and is
   * derived from the customer record in the shopping_mall_customers table.
   * The 'token' property contains the JWT access token that is used for
   * authorization in subsequent requests. The refresh token is included to
   * provide seamless session management without requiring user
   * re-authentication.
   *
   * The 'status' field indicates the current account status, derived from the
   * shopping_mall_customers table. Valid values are: 'active', 'suspended',
   * 'banned', 'pending_email_verification', 'rejected'.
   *
   * The 'created_at' field represents the timestamp when the customer account
   * was created and is derived from the shopping_mall_customers table.
   *
   * The 'updated_at' field represents the timestamp when the customer account
   * was last updated and is derived from the shopping_mall_customers table.
   *
   * The 'deleted_at' field represents the timestamp when the customer account
   * was soft-deleted and is derived from the shopping_mall_customers table. A
   * NULL value indicates an active account.
   *
   * This schema excludes sensitive information such as password_hash, salt,
   * or any internal system identifiers except for customer_id which is
   * required for token ownership verification. It also excludes session
   * details which are not needed for client-side authentication operations.
   *
   * This schema is returned from both POST /auth/customer/login and POST
   * /auth/customer/refresh.
   */
  export type IAuthorized = {
    /**
     * Unique identifier (UUID) of the authenticated customer.
     *
     * This value is extracted from the shopping_mall_customers table and
     * corresponds to the 'id' field of the customer record. The ID is
     * generated by the database system and serves as the primary identifier
     * for API authorization. This field is included to allow the frontend
     * to pre-populate user preferences and persist session identity
     * locally.
     */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;

    /**
     * Account status of the customer. Valid values: "active", "suspended",
     * "banned", "pending_email_verification", "rejected". Controls access
     * to platform features.
     *
     * This property is populated from the corresponding field in the
     * shopping_mall_customers table. It determines whether the customer can
     * access platform features.
     *
     * - Active: Full platform access
     * - Suspended: Temporary restriction of access
     * - Banned: Permanent restriction of access
     * - Pending_email_verification: Account creation pending email
     *   confirmation
     * - Rejected: Account creation was rejected by admin
     */
    status:
      | "active"
      | "suspended"
      | "banned"
      | "pending_email_verification"
      | "rejected";

    /**
     * Timestamp when the customer account was created in the
     * shopping_mall_customers table.
     *
     * This field is populated automatically by the database when a new
     * customer record is created. It tracks the account lifecycle onset and
     * is used for reporting, analytics, and audit purposes.
     *
     * Format: ISO 8601 date-time string (YYYY-MM-DDTHH:mm:ss.SSSZ)
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the customer account was last updated in the
     * shopping_mall_customers table.
     *
     * This field is updated automatically by the database whenever any
     * field in the customer record is modified (excluding password_hash
     * which is handled separately). It tracks active account modifications
     * and is used for detecting potential security breaches or unauthorized
     * changes.
     *
     * Format: ISO 8601 date-time string (YYYY-MM-DDTHH:mm:ss.SSSZ)
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the customer account was soft-deleted in the
     * shopping_mall_customers table.
     *
     * This field indicates the time when the customer account was marked as
     * deleted. If the value is NULL, the account is still active. If the
     * value is a valid timestamp, the account has been soft-deleted and can
     * be recovered or purged according to retention policies.
     *
     * Soft-deletion enables account recovery, audit trails, and compliance
     * with data retention regulations.
     *
     * Format: ISO 8601 date-time string (YYYY-MM-DDTHH:mm:ss.SSSZ)
     */
    deleted_at: string & tags.Format<"date-time">;

    /**
     * Unique identifier of the customer to whom this authentication token
     * belongs.
     *
     * This value corresponds to the 'id' field in the
     * shopping_mall_customers table and is used for token ownership
     * verification and security validation. It ensures that access tokens
     * are only valid for the customer who requested them and prevents token
     * reuse across different customer accounts.
     *
     * Format: UUID
     */
    customer_id: string & tags.Format<"uuid">;
  };

  /**
   * Authentication credentials for customer login.
   *
   * This schema defines the parameters required for authenticating a
   * registered customer through email and password verification against the
   * shopping_mall_customers database table. The system requires both email
   * and password fields to perform authentication.
   *
   * The email field is validated as a unique identifier corresponding to a
   * customer record in the database. The password field is submitted in plain
   * text and is cryptographically hashed on the server-side for comparison
   * against the stored password_hash value.
   *
   * The status field specifies the expected account status for successful
   * authentication. To allow login, the account must have a status of
   * 'active'. Accounts with status 'suspended', 'banned', or
   * 'pending_email_verification' will be denied authentication.
   *
   * This schema excludes system-generated fields like id, created_at, and
   * updated_at since they are managed by the database. It also excludes any
   * actor identity fields (like customer_id) because they are derived from
   * the authentication context and not provided by the client.
   *
   * Field values must adhere to the validation rules defined in the Prisma
   * schema (email format, minimum password length, etc.).
   */
  export type IRequest = {
    /**
     * Customer's unique email address used for authentication and
     * communication. Must be unique across all customers.
     *
     * This field corresponds to the 'email' column in the
     * shopping_mall_customers Prisma schema. The email must be in a valid
     * format and match an active customer record in the database.
     */
    email: string & tags.Format<"email">;

    /**
     * Customer's plain-text password for authentication verification.
     *
     * This field maps to the 'password_hash' column in the
     * shopping_mall_customers Prisma schema. The system receives the
     * plain-text password, hashes it using a secure algorithm, and compares
     * the result with the stored hash. The client never sends pre-hashed
     * passwords; hashing is the backend's responsibility.
     *
     * Password must meet minimum security requirements (length, complexity)
     * as defined in the Prisma model constraints.
     */
    password: string & tags.MinLength<8>;

    /**
     * Client IP address from which the login request originates.
     *
     * This field is used to create a session record in the
     * shopping_mall_customer_sessions table. The server can extract IP from
     * the HTTP request headers, but providing it in the request body
     * ensures accurate tracking in cases where the backend is behind a
     * proxy or load balancer (SSR scenarios).
     *
     * Format: IPv4 address (e.g., 192.168.1.1)
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;

    /**
     * The URL of the page from which the customer initiated the login
     * process.
     *
     * This metadata is stored in the shopping_mall_customer_sessions table
     * to create an audit trail of the customer's interaction path. It helps
     * identify login sources and detect potentially suspicious behavior
     * patterns. The value should be the full URL of the current page.
     *
     * Format: URI (Uniform Resource Identifier)
     */
    href: string & tags.Format<"uri">;

    /**
     * The URL of the previous page from which the customer navigated to the
     * login page.
     *
     * This metadata is stored in the shopping_mall_customer_sessions table
     * to create an audit trail of the customer's interaction path. It helps
     * identify marketing channels and referral sources. For direct access,
     * this value should be an empty string.
     *
     * Format: URI (Uniform Resource Identifier)
     */
    referrer: string & tags.Format<"uri">;

    /**
     * The expected account status for successful authentication.
     *
     * This field is used to validate that the account being authenticated
     * has the correct status. Only accounts with status 'active' can be
     * authenticated successfully.
     *
     * Valid values:
     *
     * - Active: Account is active and can be authenticated
     * - Suspended: Account is temporarily suspended and authentication will
     *   be rejected
     * - Banned: Account is permanently banned and authentication will be
     *   rejected
     * - Pending_email_verification: Account requires email verification and
     *   authentication will be rejected
     * - Rejected: Account was rejected and authentication will be rejected
     */
    status:
      | "active"
      | "suspended"
      | "banned"
      | "pending_email_verification"
      | "rejected";
  };

  /**
   * Refresh token to renew the access token.
   *
   * This schema defines the structure for requesting a new access token using
   * a previously issued refresh token from the
   * shopping_mall_customer_sessions table. The refresh token is a long-lived
   * JWT that has been securely stored on the server with associated
   * customer_id and expiration information.
   *
   * The request body contains only the refresh token string, which the server
   * validates against the customer_sessions table. Upon successful
   * validation, new access and refresh tokens are issued.
   *
   * This schema excludes any customer identity fields (like customer_id)
   * because they are derived from the refresh token's payload and server-side
   * session records. It also excludes any session metadata like IP address or
   * user agent, which are captured during initial login and not required for
   * token renewal.
   *
   * The customer_id field is required for token validation and is
   * automatically extracted from the refresh token's payload when the server
   * validates it against the shopping_mall_customer_sessions table.
   */
  export type IRefresh = {
    /**
     * The refresh token issued during initial authentication that is used
     * to obtain a new access token.
     *
     * This token is stored in the shopping_mall_customer_sessions table and
     * linked to a specific customer_id. It has a long expiration time but
     * is single-use and can be invalidated by the system (e.g., on logout
     * or security events). It must be a valid, non-expired JWT issued by
     * the system.
     *
     * Format: Base64-encoded JWT string adhering to the system's token
     * generation standards.
     */
    refresh_token: string & tags.MinLength<100> & tags.MaxLength<2000>;

    /**
     * Unique identifier of the customer associated with the refresh token.
     *
     * This value is extracted from the refresh token's payload and
     * validated against the customer_id field in the
     * shopping_mall_customer_sessions table. It ensures that the refresh
     * token is being used by the correct customer and prevents token reuse
     * across different accounts.
     *
     * Format: UUID
     */
    customer_id: string & tags.Format<"uuid">;
  };
}
