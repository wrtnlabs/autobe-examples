import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IEconomicDiscussionSuperAdministrator {
  /**
   * Authorization response for super administrators containing JWT access token and user identity. This is returned after successful authentication via join, login, or refresh operations. The response contains only the super administrator's unique identifier and an authentication token. No personal details, passwords, or session information are exposed. The client uses the id to recognize the authenticated user and the token to make subsequent authenticated API requests.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the authenticated super administrator, extracted from the JWT access token claims.
     *
     * @x-autobe-specification Extracted from JWT claims. Contains the super_administrator.id from the authentication token issued during login/join/refresh operations. This is not a database column but a claim value embedded in the JWT token.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Request payload containing a valid refresh token required to obtain new access and refresh tokens without re-authenticating with credentials. This single token string must be previously issued by the system and stored securely during authentication.
   */
  export type IRefresh = {
    /**
     * The refresh token used to authenticate the token renewal request. This token must be a valid refresh token previously issued by the system and stored in the database.
     *
     * @x-autobe-specification The refresh token string must exactly match a value stored in the economic_discussion_super_administrator_sessions.refresh_token field. This token is validated for existence, non-expiration, and integrity before any issuance of new tokens. The token is received directly from the client request and transmitted in the request body without any additional processing or transformation.
     */
    token: string;
  };

  /**
   * Login request for super administrators to authenticate using email and password. The client provides the super administrator's email and plain-text password for server-side verification. Password is not pre-hashed; the server handles password hashing and verification using bcrypt algorithm. Authentication tokens are generated server-side after successful verification. The email must be a valid email address format.
   */
  export type ILogin = {
    /**
     * Super administrator's email address used for authentication and account identification.
     *
     * @x-autobe-specification Authentication field for super administrator email. Not stored as column in database; used to query the identity system to find matching record by email. Must be a valid email address format as per RFC 5322.
     */
    email: string & tags.Format<"email">;

    /**
     * Plaintext password used for authenticating the super administrator account. Must be provided in clear text; server will hash and verify against stored password_hash.
     *
     * @x-autobe-specification Authentication field for super administrator password. Not stored in database as plaintext or hash; client provides plaintext password which server hashes via bcrypt and compares against stored password_hash in the identity system. This field never appears in the database schema as a column.
     */
    password: string;
  };

  /**
   * Registration data for creating a new super administrator account. Requires valid email, password meeting complexity requirements, and display_name for public identification.
   */
  export type IJoin = {
    /**
     * Super administrator's email address used for login and account identification. Must be unique system-wide and must match constraint defined in business logic rather than direct column mapping.
     *
     * @x-autobe-specification Application-level property. Client submits email. Backend checks uniqueness against super_administrators table and stores in database column that is not part of this schema (model inconsistency). This DTO represents the registration contract, not the database column mapping. Schema only exposes id; other properties are processed by application via ORM/transformations.
     */
    email: string & tags.Format<"email">;

    /**
     * User's password for authentication. Must be at least 8 characters and meet complexity requirements. Sent as plaintext by client and hashed server-side prior to storage.
     *
     * @x-autobe-specification Application-level property. Client submits plaintext password. Backend intentionally avoids storing plaintext. Hashes using bcrypt and creates entry in the database using a column (password_hash) that does not exist in this schema (app-schema mismatch). This DTO accepts plain text for UX but internally maps to a non-declared column. Downstream must implement transformation: request.password → database.password_hash.
     */
    password: string & tags.MinLength<8>;

    /**
     * Public display name for the super administrator, shown in interface and audit logs. Must be between 1 and 100 characters. Stored in database but not directly accessible as a column in the provided schema.
     *
     * @x-autobe-specification Application-level property. Client submits display_name. Backend stores it in a database column that does not exist in the provided schema. Schema only contains id — display_name is handled by ORM or view layer, not direct DB column mapping. Must be implemented as a logical transformation: display_name → [non-specified column].
     */
    display_name: string & tags.MinLength<1> & tags.MaxLength<100>;
  };
}
