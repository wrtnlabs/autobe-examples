import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IMultiUserTodoMember {
  /**
   * Request payload used by an authenticated member to renew authorization tokens. Provide the previously issued refresh credential so the server can validate the associated session and its expiry, then return a new token pair.
   */
  export type IRefresh = {
    /**
     * Opaque refresh token presented by the client to obtain a new access/refresh token pair after the prior access token expires.
     *
     * @x-autobe-specification Use the provided refreshToken as an opaque credential to resolve the member session in multi_user_todo_member_sessions. Validate that the session is not expired by checking multi_user_todo_member_sessions.expired_at > now. Also ensure the owning member is active by requiring multi_user_todo_members.deleted_at is null. Reject invalid/expired credentials with unified auth errors. Do not accept or derive member_id/session_id from the client request body; identity must be determined server-side from the refresh credential.
     */
    refreshToken: string;
  };

  /**
   * Login request payload for authenticated member accounts. Includes member credentials (email + plaintext password) plus request context (href/referrer and optional IP) that the server uses to create a member session safely and securely.
   */
  export type ILogin = {
    /**
     * Member account email address used to find the member account during login.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Look up multi_user_todo_members by email (normalize as needed). Reject login if no member is found or if multi_user_todo_members.deleted_at is not null.
     */
    email: string & tags.Format<"email">;

    /**
     * Plaintext password provided by the member for credential verification.
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Treat as plaintext password supplied by the client. Verify it against multi_user_todo_members.password_hash using a secure password verification function. Do not store password plaintext in the DTO handling beyond verification.
     */
    password: string & tags.Format<"password">;

    /**
     * The request URL/href context used as part of the created member session metadata.
     *
     * @x-autobe-specification Capture the request's href/entry URL context and persist it into the created multi_user_todo_member_sessions record as connection metadata.
     */
    href: string & tags.Format<"uri">;

    /**
     * The referrer URL context used as part of the created member session metadata.
     *
     * @x-autobe-specification Capture the request referrer URL context and persist it into the created multi_user_todo_member_sessions record as connection metadata.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Optional client IP address used as connection metadata for the created member session.
     *
     * @x-autobe-specification If provided by the client, persist it into the created multi_user_todo_member_sessions record as connection metadata. If omitted, the service may use a server-side fallback IP capture.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };

  /**
   * Authentication/authorization result returned after a member successfully registers, logs in, or refreshes their session. It contains the authenticated member id and the issued access/refresh token pair that the client can use for subsequent protected API calls.
   */
  export type IAuthorized = {
    /**
     * Authenticated member id that owns the issued tokens.
     *
     * @x-autobe-specification Set `id` to the authenticated member account identifier resolved during join/login/refresh. Implementation: after member is created (join) or authenticated (login) or session is validated (refresh), read the member's `multi_user_todo_members.id` for the session and assign it to `id`.
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
   * Request payload used by a guest/member join endpoint to create a new authenticated member account. The client provides an email address and a plaintext password; the server normalizes the email, hashes the password, stores the new member record, and returns authorization tokens.
   */
  export type IJoin = {
    /**
     * Member account email address used to register and later authenticate.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from request.email to multi_user_todo_members.email. Apply the same normalization rules as the join implementation so uniqueness checks match exactly (e.g., trim and lowercase). Validate it as an email address.
     */
    email: string & tags.Format<"email">;

    /**
     * Plaintext password used to register the new member account (server hashes and stores it).
     *
     * @x-autobe-specification Accept plaintext password string from the client. Server hashes it and stores the hash into multi_user_todo_members.password_hash. Never persist or return plaintext.
     * @x-autobe-database-schema-property password_hash
     */
    password: boolean;
  };

  /**
   * Lightweight, non-sensitive member identity used in other responses (e.g., as the owner of an email verification token). Includes only account id/email and lifecycle timestamps, suitable for list/detail views without exposing credentials.
   */
  export type ISummary = {
    /**
     * Unique identifier of the member account.
     *
     * @x-autobe-specification Direct mapping from multi_user_todo_members.id. Serialize as UUID string.
     * @x-autobe-database-schema-property id
     */
    id?: null | undefined;

    /**
     * Member account email address used as the login identity.
     *
     * @x-autobe-specification Direct mapping from multi_user_todo_members.email. Serialize as string.
     * @x-autobe-database-schema-property email
     */
    email?: null | undefined;

    /**
     * Timestamp when the member account was created.
     *
     * @x-autobe-specification Direct mapping from multi_user_todo_members.created_at. Convert timestamptz to RFC3339 date-time string.
     * @x-autobe-database-schema-property created_at
     */
    created_at?: null | undefined;

    /**
     * Timestamp when the member account was last updated.
     *
     * @x-autobe-specification Direct mapping from multi_user_todo_members.updated_at. Convert timestamptz to RFC3339 date-time string.
     * @x-autobe-database-schema-property updated_at
     */
    updated_at?: null | undefined;

    /**
     * Soft-deletion timestamp for the member account; null if the account is active.
     *
     * @x-autobe-specification Direct mapping from multi_user_todo_members.deleted_at. Convert timestamptz to RFC3339 date-time string; use null when the account is active.
     * @x-autobe-database-schema-property deleted_at
     */
    deleted_at?: null | undefined;
  };
}
