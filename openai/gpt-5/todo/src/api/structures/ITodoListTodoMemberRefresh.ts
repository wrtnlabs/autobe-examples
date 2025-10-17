export namespace ITodoListTodoMemberRefresh {
  /**
   * Request body for renewing JWTs of a member (todoMember) account.
   *
   * This DTO is used by the token refresh operation associated with the
   * Prisma model `todo_list_todo_members`, which contains identity and
   * credential columns such as `id`, `email`, `password_hash`, `created_at`,
   * `updated_at`, and `deleted_at`. The refresh workflow validates this
   * token, rechecks that the corresponding member record remains active
   * (`deleted_at` is null), and then issues new tokens.
   *
   * Important: This schema does not map 1:1 to a Prisma table and therefore
   * does not include database fields like `password_hash`. It only carries
   * the refresh token required to perform the renewal.
   */
  export type ICreate = {
    /**
     * Refresh token to renew a todoMember session.
     *
     * This value represents the client's refresh token, typically a JWT in
     * compact JWS form, issued during a prior authentication flow. It is
     * presented to obtain a new access token without re-supplying primary
     * credentials.
     *
     * Security note: Treat this token as a secret. Do not log or expose it
     * inadvertently.
     */
    refresh_token: string;
  };
}
