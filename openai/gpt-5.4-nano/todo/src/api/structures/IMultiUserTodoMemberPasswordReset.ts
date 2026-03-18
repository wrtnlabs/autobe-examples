import { tags } from "typia";

export namespace IMultiUserTodoMemberPasswordReset {
  /**
   * Represents the server-side validation result for a member password reset token. The client provides an opaque reset token; the API verifies it exists and has not expired, then returns the token identifier, its expiration timestamp, and a boolean validity flag. Member identity is never exposed.
   */
  export type IInvert = {
    /**
     * The opaque password reset token identifier provided by the client.
     *
     * @x-autobe-database-schema-property token
     * @x-autobe-specification Direct mapping from multi_user_todo_member_password_resets.token. Populate this with the validated token value that matched the lookup.
     */
    resetId: string & tags.Format<"uri">;

    /**
     * The UTC timestamp after which the reset token is no longer valid.
     *
     * @x-autobe-database-schema-property expires_at
     * @x-autobe-specification Direct mapping from multi_user_todo_member_password_resets.expires_at. Must be the exact expiration time used to determine validity (server-side comparison uses timestamptz semantics).
     */
    expiresAt: string & tags.Format<"date-time">;

    /**
     * Whether the provided reset token is currently valid (true when validation succeeds).
     *
     * @x-autobe-specification Computed value. Set to true only when a row is found for token=resetId and expires_at is strictly later than the current server time. If the row is missing or expires_at is in the past, the operation must reject instead of returning isValid=false (per the operation’s validate-and-return behavior).
     */
    isValid: boolean;
  };

  /**
   * Indicates whether the member password reset operation completed successfully.
   */
  export type ISuccess = {
    /**
     * True when the password reset was processed successfully and the reset token has been invalidated.
     *
     * @x-autobe-specification Server-computed boolean. Set to true only after: (1) the provided reset token lookup succeeds and passes expiration/revocation checks, (2) the member password_hash is updated to the new hashed password, and (3) the reset token record is invalidated in the same transaction. The value must not be returned as true for any token validation failure.
     */
    success: boolean;
  };

  /**
   * Password reset request payload. Provide the server-issued reset token and a new password; the backend validates the token (non-expired and non-revoked), hashes the new password, updates the authenticated member’s stored password hash, and invalidates the token so it cannot be reused.
   */
  export type IRequest = {
    /**
     * Opaque password reset token issued by the server. It must correspond to an existing, non-expired, non-revoked reset record.
     *
     * @x-autobe-database-schema-property token
     * @x-autobe-specification Direct mapping to multi_user_todo_member_password_resets.token. Used as the lookup key; after lookup, apply validity checks: deleted_at must be null and expires_at must be in the future. Never reveal token existence or associated member identity in error responses.
     */
    token: string & tags.MinLength<1>;

    /**
     * New password in plaintext. The server will hash it and replace the member’s stored password hash.
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Server hashes the provided plaintext password and stores the result in multi_user_todo_members.password_hash. Do not persist plaintext. Password validation (non-empty and any strength rules) is applied before updating the member.
     */
    password: string & tags.MinLength<1>;

    /**
     * Target page number to request, using 1-indexing. Does not change the password reset mutation behavior.
     *
     * @x-autobe-specification Request-only control parameter. It must not affect token validation, password hashing, or token invalidation. If present, it is used only for consistent request parsing/possible list-shaped response behavior (if supported by the endpoint implementation).
     */
    page?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Maximum number of records per page for any paginated/list-shaped response. Does not change the password reset mutation behavior.
     *
     * @x-autobe-specification Request-only control parameter. It must not affect token validation, password hashing, or token invalidation. If present, it is used only for consistent request parsing/possible list-shaped response behavior (if supported by the endpoint implementation).
     */
    limit?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };
}
