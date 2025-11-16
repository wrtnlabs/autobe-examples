import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoListUser {
  /**
   * Request payload for creating a new member user account. Contains only the
   * necessary information to establish a new user record in the
   * todo_list_users table. Includes email and plain-text password which are
   * transformed server-side: password is hashed using bcrypt before storage
   * in the hashedPassword field, and a unique UUID is generated for the id
   * field. The createdAt timestamp is automatically set to the current date
   * and time in the Asia/Seoul timezone. The isActive flag is explicitly set
   * to true during creation, as all new users are active by default. The role
   * field defaults to 'member', as defined in the Prisma schema. No
   * additional fields are included because the todo_list_users schema does
   * not have other required or nullable fields for registration beyond email
   * and password.
   *
   * For self-registration operations (authorizationActor: null), this schema
   * MUST include session context fields: ip (optional), href (required), and
   * referrer (required) to enable proper session tracking and security
   * auditing for the newly created user account. These fields are not
   * authentication context (which comes from JWT) but connection metadata
   * required to initialize the session record in the database.
   */
  export type ICreate = {
    /**
     * User's email address for authentication and communication. This field
     * must be unique across all users as it serves as the primary
     * identifier for login. Validated against RFC 5322 email format
     * standards during server-side processing.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain text password provided by the user during registration. This
     * field is transformed server-side: the password is hashed using bcrypt
     * and stored in the hashedPassword field of the todo_list_users table.
     * Clients should never send pre-hashed passwords - the backend handles
     * all password encryption.
     */
    password: string;

    /**
     * Client IP address from which the registration request originated.
     * This field is recorded in the todo_list_users_sessions table for
     * security auditing purposes. The server can extract this value from
     * the HTTP request, but client may provide this value when operating in
     * SSR (Server-Side Rendering) environments where IP extraction may not
     * be reliable.
     */
    ip?: string | null | undefined;

    /**
     * The absolute URL of the current page or application state when the
     * user initiated registration. This is recorded in the
     * todo_list_users_sessions table for security and UX context. The href
     * value helps track user navigation patterns and is mandatory for
     * session initialization.
     */
    href: string;

    /**
     * The URL of the previous web page from which the user arrived at the
     * registration page. This is recorded in the todo_list_users_sessions
     * table for security and analytics purposes. Referrer information helps
     * detect suspicious referral patterns and is mandatory for session
     * initialization.
     */
    referrer: string;
  };

  /**
   * Authorization token response structure.
   *
   * This interface defines the structure of the authorization token response
   * returned after successful user authentication. It contains minimal
   * information required to identify the authenticated user in the system.
   *
   * THIS IS A SECURE VERSION OF THE AUTHORIZATION TOKEN RESPONSE.
   *
   * Originally, this schema exposed the 'access' and 'refresh' tokens and
   * timestamp fields, which represented a critical security vulnerability.
   * These tokens should NEVER be exposed in response DTOs as they are
   * sensitive authentication credentials.
   *
   * The correct implementation requires that after authentication, the
   * server:
   *
   * 1. Generates and sets access and refresh tokens in HTTP-only secure cookies
   * 2. Includes only the authenticated user's ID in the response body
   * 3. Never exposes raw tokens or expiration timestamps to the client
   *
   * This secure structure prevents token theft attacks, session hijacking,
   * and other authentication breaches. The presence of any token fields
   * (access, refresh) in the response body would constitute a critical
   * security vulnerability.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated user. This UUID is assigned to
     * the user upon account creation and is included in the JWT token
     * payload.
     *
     * This field is used for identifying the user across the system in all
     * subsequent operations. It is automatically extracted from the JWT and
     * is never sent by clients in requests.
     */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /** String */
  export type ILogin = string;

  /** String */
  export type IRefresh = string;
}
