import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoTodoUser {
  /**
   * User registration request payload. Contains authentication credentials
   * required to create a new account.
   *
   * CRITICAL INSTRUCTIONS FOR OPTIMAL AI GENERATION:
   *
   * When creating descriptions for components, types, and properties:
   *
   * 1. ALWAYS refer to and incorporate the description comments from the
   *    corresponding Prisma DB schema tables and columns. The descriptions
   *    should match the style, level of detail, and terminology used in the
   *    Prisma schema.
   * 2. ALL descriptions MUST be organized into MULTIPLE PARAGRAPHS separated by
   *    line breaks. Single-paragraph descriptions should be avoided.
   * 3. Descriptions should comprehensively cover:
   *
   *    - The purpose and business meaning of the type or property
   *    - Relationships to other entities
   *    - Validation rules, constraints, and edge cases
   *    - Usage context and examples when helpful
   * 4. For each property of an object type, ensure its description reflects the
   *    corresponding column description in the Prisma DB schema, maintaining
   *    the same level of detail and terminology
   * 5. Descriptions should be so detailed and clear that anyone reading them can
   *    fully understand the type or property without needing to reference any
   *    other documentation
   *
   * > MUST be written in English. Never use other languages.
   *
   * #### Example Description Structure
   *
   * This property represents the email address for user authentication.
   *
   * The email address is used as the primary identifier for the user account.
   *
   * Email validation follows standard format requirements to ensure validity
   * and prevent invalid registrations.
   *
   * Example usage: 'user@example.com', 'j.smith@company.com'.
   *
   * #### Property Reference
   *
   * - Prisma Table (users) Column: email
   * - Prisma Comment: User's email address for authentication. Must be a valid
   *   email format.
   * - Constraints: Valid email format (e.g., 'user@domain.com').
   * - Business Constraint: Email is used as the primary authentication method
   *   for user accounts.
   * - Validation: System validates email format during registration and login.
   *
   * #### Value Examples
   *
   * - 'user@example.com' (valid)
   * - 'example' (invalid - missing '@' and domain)
   * - 'user@' (invalid - missing domain)
   * - '@example.com' (invalid - missing username)
   *
   * #### Business Rule Context
   *
   * The email field serves as the primary user identifier for authentication
   * purposes. It's the first piece of information users provide when creating
   * an account. The system enforces strict email validation rules to ensure
   * all accounts use properly formatted identifiers, preventing invalid
   * entries in the user database and simplifying account recovery processes.
   *
   * #### Example Description Structure
   *
   * This property represents the user's password for authentication.
   *
   * The password is submitted in plain text during registration to be handled
   * securely by the system.
   *
   * The system handles all hashing and security processing to protect user
   * credentials without requiring clients to manage any cryptographic
   * operations.
   *
   * Example usage: 'p@ssw0rd123', 'S3cur3P4ss!', 'aBcDeFgH'.
   *
   * #### Property Reference
   *
   * - Prisma Table (users) Column: password
   * - Prisma Comment: User's password for authentication. This must be plain
   *   text for the registration process as the system will handle hashing.
   * - Constraints: Minimum of 1 character, maximum of 256 characters.
   * - Business Constraint: Passwords must be strong according to security
   *   policy standards.
   * - Validation: System validates password strength requirements and handles
   *   password hashing.
   *
   * #### Value Examples
   *
   * - 'p@ssw0rd123' (valid)
   * - 'password' (invalid - too weak)
   * - 'a' (invalid - too short)
   * - 'a123456789012345678901234567890123456789012345678901234567890' (invalid
   *   - too long)
   *
   * #### Business Rule Context
   *
   * The password field is a security-critical component of user
   * authentication. The system never stores passwords in plaintext, instead
   * using secure hashing algorithms. The user provides the password in plain
   * text for registration, and the system handles all cryptographic
   * operations. This separation of responsibility ensures that password
   * management remains secure without placing additional complexity on client
   * applications.
   *
   * #### Example Description Structure
   *
   * This property represents the client's IP address for session tracking.
   *
   * The IP address is optional, as the server can often extract it from the
   * request context.
   *
   * Client may provide this value when using server-side rendering scenarios
   * where the server doesn't have access to the request context.
   *
   * Example usage: '192.168.1.1', '10.0.0.1'.
   *
   * #### Property Reference
   *
   * - Prisma Table: Not applicable (client-provided session metadata)
   * - Constraints: Valid IPv4 format (e.g., '192.168.1.1'), optional.
   * - Business Constraint: Session tracking requires IP address for security
   *   monitoring.
   * - Validation: System validates IP format when provided.
   *
   * #### Value Examples
   *
   * - '192.168.1.1' (valid)
   * - '10.0.0.1' (valid)
   * - '10.0.0.1.5' (invalid - wrong format)
   *
   * #### Business Rule Context
   *
   * Session tracking includes capturing the client's IP address to help
   * protect against unauthorized access and provide security context. While
   * the server can often obtain this information from incoming requests, it's
   * useful to include in the request payload for server-side rendering
   * scenarios where the server might not have direct access to the client's
   * network information. This field is optional and can be omitted if the
   * server can infer the IP address.
   *
   * #### Example Description Structure
   *
   * This property represents the connection URL (current page URL) for
   * session tracking.
   *
   * The connection URL must be provided by the client to establish the
   * session context.
   *
   * This is mandatory because the server cannot infer the current page URL
   * from the request data alone.
   *
   * Example usage: 'https://app.example.com/signup',
   * 'https://example.com/register'.
   *
   * #### Property Reference
   *
   * - Prisma Table: Not applicable (client-provided session metadata)
   * - Constraints: Valid URI format, mandatory.
   * - Business Constraint: Session tracking requires reference to the current
   *   page URL.
   * - Validation: System validates URI format.
   *
   * #### Value Examples
   *
   * - 'https://app.example.com/signup' (valid)
   * - 'htp://wrong-protocol.com' (invalid - wrong protocol)
   * - '' (invalid - empty value)
   *
   * #### Business Rule Context
   *
   * The connection URL (href) is critical for session creation. It helps the
   * application track which page the user is currently viewing when they
   * create a session, which is useful for analytics, security monitoring, and
   * user journey tracking. This field is mandatory because the server cannot
   * know this information solely from the request, and the client must
   * provide it to establish the session context correctly.
   *
   * #### Example Description Structure
   *
   * This property represents the referrer URL (previous page URL) for session
   * tracking.
   *
   * The referrer URL must be provided by the client to establish the session
   * context.
   *
   * This is mandatory because the server cannot infer the previous page URL
   * from the request data alone.
   *
   * Example usage: 'https://app.example.com/signin',
   * 'https://example.com/login'.
   *
   * #### Property Reference
   *
   * - Prisma Table: Not applicable (client-provided session metadata)
   * - Constraints: Valid URI format, mandatory.
   * - Business Constraint: Session tracking requires reference to the previous
   *   page URL.
   * - Validation: System validates URI format.
   *
   * #### Value Examples
   *
   * - 'https://app.example.com/signin' (valid)
   * - 'http://example.com/login' (valid)
   * - '' (invalid - empty value)
   *
   * #### Business Rule Context
   *
   * The referrer URL helps the system understand the user's journey leading
   * to the current page. This information is crucial for user experience
   * analysis and site navigation improvement efforts. For security reasons,
   * it's required to capture both the current page (href) and the previous
   * page (referrer) to have a complete context for session management and
   * security monitoring. This field is mandatory because the server cannot
   * reliably determine the referrer from other parts of the request.
   *
   * This interface is used for account registration, which is a self-signup
   * operation requiring session context fields (ip, href, referrer) to
   * establish proper session tracking and security monitoring.
   */
  export type ICreate = string;

  /** Login success response with authentication tokens. */
  export type IAuthorized = {
    /** Unique identifier of the authenticated user. */
    id: string;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Login request payload. Contains credentials for authentication. For
   * self-login operations, includes session context fields (href, referrer
   * required, ip optional). Must exclude user_id fields (comes from JWT
   * context).
   */
  export type ILogin = string;

  /**
   * Refresh token request payload. Contains the current refresh token to
   * renew the session.
   */
  export type IRefresh = string;
}
