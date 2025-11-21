import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoListUserListUser {
  /**
   * Request to register a new user account in the Todo List application.
   *
   * This data structure is used when creating a new user account through the
   * registration process. It contains the essential information needed to
   * establish a user's identity in the system, including their email address
   * and password. The registration also captures connection context
   * information for security monitoring purposes.
   *
   * Upon successful registration, the user will receive initial JWT tokens
   * for authentication. The email must be unique across all users in the
   * system, and the password will be securely hashed before storage.
   *
   * Note that while the ip field is optional (as the server can extract the
   * IP from the request), both href and referrer are mandatory as they
   * provide crucial context that the server cannot infer. These session
   * context fields are required for creating a proper authentication session
   * record even for the initial registration.
   *
   * The data structure follows security best practices with secure password
   * handling and comprehensive session tracking to detect and prevent
   * fraudulent registration attempts.
   */
  export type IJoin = {
    /**
     * Unique email address used for user authentication.
     *
     * Must be a valid email format and is case-insensitive for login
     * purposes. This field serves as the primary identifier for user
     * authentication and must be unique across all user accounts in the
     * system. The email validation ensures only properly formatted email
     * addresses are accepted.
     *
     * This corresponds to the email field in the todo_list_users Prisma
     * model which is defined with a unique constraint to prevent duplicate
     * registrations. The case-insensitive handling ensures consistent user
     * experience regardless of input case during login attempts.
     */
    email: string & tags.Format<"email">;

    /**
     * Securely hashed password for user authentication.
     *
     * This password will be securely hashed using industry-standard bcrypt
     * algorithm with appropriate salt before storage. It must meet system
     * requirements for strength and complexity to ensure account security.
     * The plain text password is only used during registration and is never
     * stored in plain text form.
     *
     * The password handling follows security best practices with proper
     * hashing algorithms and salting techniques. The bcrypt implementation
     * includes appropriate cost factors to balance security with
     * performance considerations.
     */
    password: string;
  };

  /**
   * User login credentials for authentication.
   *
   * This DTO contains the necessary information for a user to authenticate
   * with the system. The email and password are used to verify the user's
   * identity against the stored credentials in the todo_list_users table.
   *
   * The email field must be a valid email address format that matches the
   * user's registered email. The password should be the plain text version
   * which will be securely compared against the bcrypt hashed value stored in
   * the database.
   *
   * In addition to authentication credentials, this DTO includes session
   * context fields that provide connection metadata for security monitoring
   * purposes. The href and referrer fields are mandatory for tracking user
   * navigation patterns, while the IP address is optional since the server
   * can extract it from the request.
   *
   * These session context fields are stored in the todo_list_user_sessions
   * table to maintain an audit trail of authentication events, enabling
   * security monitoring and potential fraud detection.
   */
  export type ILogin = {
    /**
     * User's email address used for authentication. Must be a valid email
     * format.
     */
    email: string & tags.Format<"email">;

    /**
     * User's password for authentication. This should be the plain text
     * password that will be securely hashed by the backend for storage and
     * comparison.
     */
    password: string;

    /**
     * Client IP address for session tracking. This is optional as the
     * server can extract the IP from the request, but the client may
     * provide it for server-side rendering scenarios.
     */
    ip?: string | undefined;

    /**
     * Connection URL representing the current page the user is on when
     * logging in. This provides context about where the login request
     * originated.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL representing the previous page the user was on before
     * arriving at the login page. This helps track user navigation patterns
     * for security monitoring.
     */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Response with authorized user information and access tokens.
   *
   * This data structure is returned upon successful user authentication
   * (login) or token refresh operations. It contains the essential
   * information needed for a client to maintain an authenticated session with
   * the Todo List application, including the user's identifier and the
   * necessary authentication tokens.
   *
   * The id field provides the unique identifier for the authenticated user,
   * which matches their record in the todo_list_users table. The token field
   * contains the JWT tokens required for authenticating subsequent requests
   * to protected API endpoints. This structure enables seamless access to the
   * application's features while maintaining security through token-based
   * authentication.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated user.
     *
     * This UUID corresponds to the primary key of the authenticated user in
     * the todo_list_users table. It uniquely identifies the user account
     * within the system and matches the id property in the ITodoListUser
     * entity. This allows clients to identify which user account the
     * authorization tokens are associated with.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Unique email address used for user authentication. Must be a valid
     * email format and is case-insensitive for login purposes.
     *
     * This field serves as the primary identifier for user authentication.
     * It must be unique across all user accounts in the system. The email
     * validation ensures only properly formatted email addresses are
     * accepted. The system treats email addresses as case-insensitive for
     * login purposes to improve user experience.
     */
    email: string & tags.Format<"email">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };
}
