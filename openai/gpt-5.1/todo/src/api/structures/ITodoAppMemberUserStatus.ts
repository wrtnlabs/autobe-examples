export namespace ITodoAppMemberUserStatus {
  /**
   * Update DTO for modifying the business status of a member user account in
   * the todoApp system.
   *
   * This schema is used exclusively by administrative workflows that need to
   * change the status column of the `todo_app_memberusers` Prisma model while
   * leaving immutable identity fields such as `id` and `email` untouched.
   * Typical status values include `active`, `blocked`, or `disabled`, and
   * they control whether a member is allowed to authenticate and operate on
   * todos.
   *
   * Implementations should always validate the requested status value against
   * allowed transitions and persist the change in a single transaction that
   * also refreshes the `updated_at` column. This DTO intentionally exposes
   * only the minimal field needed for status management so that
   * administrative clients cannot accidentally modify unrelated profile
   * attributes when calling the status endpoint.
   */
  export type IUpdate = {
    /**
     * New business status value to apply to the member user account.
     *
     * This string corresponds directly to the `status` column of the
     * `todo_app_memberusers` Prisma model and determines whether the member
     * is considered active, blocked, disabled, or in another well-defined
     * state. Typical implementations constrain this field to a small,
     * predefined set of values such as `active`, `blocked`, and
     * `disabled`.
     *
     * The backend must validate that the provided status value is
     * recognized and that the transition from the current status to the new
     * status is allowed under configured business rules. Clients should
     * treat this as an opaque but documented enumeration and must not
     * attempt to store user-defined free-form states.
     */
    status: string;
  };
}
