export namespace ITodoAppMemberUserChangePassword {
  /**
   * Request payload for changing the password of an authenticated member
   * user.
   *
   * This DTO is used by the password change endpoint for member users backed
   * by the `todo_app_memberusers` table. It carries the current password for
   * verification against the stored `password_hash` and the new password that
   * should replace it after passing complexity and policy checks.
   *
   * All authentication context, including which member user is performing the
   * change, is derived from the current authenticated session and associated
   * token. No user identifiers or session identifiers are included in this
   * request body; those values are resolved server-side from the security
   * context.
   */
  export type IRequest = {
    /**
     * The member user's current password in plain text as entered in the
     * password change form.
     *
     * The backend uses this value only for verification against the stored
     * `password_hash` in `todo_app_memberusers` using the configured
     * hashing algorithm. It is never persisted in plain text and must be
     * handled in memory only for the duration of verification.
     *
     * If this value does not match the existing credentials, the operation
     * fails and may increment `failed_login_count` according to
     * authentication policy.
     */
    currentPassword: string;

    /**
     * The desired new password for the member user, in plain text as
     * entered by the user.
     *
     * This value is validated against the password complexity rules and
     * security policies defined in the authentication requirements (for
     * example, minimum length, required character classes, and disallowed
     * patterns). On acceptance, the backend hashes this password and stores
     * the result in the `password_hash` column of `todo_app_memberusers`.
     *
     * The plain text value itself is never stored and should be cleared
     * from memory as soon as the hashing and update steps are complete.
     */
    newPassword: string;
  };

  /**
   * Response payload returned after a member user has requested a password
   * change.
   *
   * This type communicates the outcome of the password change process
   * initiated by an authenticated member user. It does not expose any
   * credential or internal security fields from the todo_app_memberusers or
   * todo_app_memberuser_sessions tables.
   *
   * The response indicates whether the password update and associated session
   * invalidation have completed successfully, and optionally carries a brief,
   * user-facing message describing the result. It is intentionally minimal to
   * avoid leaking security-sensitive implementation details.
   */
  export type IResponse = {
    /**
     * Flag indicating whether the password change operation has completed
     * successfully.
     *
     * When true, the service has validated the current password, enforced
     * password complexity rules for the new password, updated the
     * password_hash field for the authenticated member user, reset
     * failed_login_count, updated updated_at, and expired relevant sessions
     * in todo_app_memberuser_sessions.
     *
     * When false, the password change was rejected due to validation
     * failure, incorrect current password, or another business rule, and no
     * credential changes were persisted.
     */
    success: boolean;

    /**
     * Optional human-readable explanation of the password change result.
     *
     * This property itself is optional: when present, it is always a
     * non-null string that can be displayed directly in the UI or recorded
     * in logs. On success, it may contain a short confirmation message; on
     * failure, it may provide a high-level reason why the operation could
     * not be completed, without revealing sensitive authentication or
     * policy details.
     *
     * Clients should treat the absence of this property as "no additional
     * message provided" rather than as an error condition.
     */
    message?: string | undefined;
  };
}
