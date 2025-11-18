import { tags } from "typia";

export namespace ITodoAppMemberUserLogoutAll {
  /**
   * Response payload for the global logout operation for member users.
   *
   * This DTO represents the outcome of a "log out from all devices" action
   * initiated by an authenticated member user. It confirms that all active
   * sessions recorded in the `todo_app_memberuser_sessions` table for the
   * current account have been expired and that any related access or refresh
   * tokens have been invalidated.
   *
   * The fields focus on conveying whether the operation was successful from
   * the client perspective and summarizing how many sessions were affected,
   * without exposing any sensitive authentication data or internal
   * identifiers.
   */
  export type IResponse = {
    /**
     * Indicates whether the global logout operation completed successfully
     * from the service perspective.
     *
     * When `true`, the backend has iterated over all active sessions for
     * the authenticated member user and set `expired_at` appropriately in
     * `todo_app_memberuser_sessions`, and has triggered token invalidation
     * for affected sessions.
     *
     * When `false`, the operation could not be completed as requested, and
     * the `message` field typically carries a human-readable explanation
     * suitable for client display or logging.
     */
    success: boolean;

    /**
     * Number of member user sessions that were actively terminated by this
     * global logout invocation.
     *
     * This value counts only sessions that transitioned from active (no
     * `expired_at` value set) to expired as part of the current request.
     * Sessions that had already been expired before the call are not
     * included.
     *
     * Clients can use this count for UX messaging (for example, to display
     * how many devices were signed out) and for basic audit confirmation.
     */
    affectedSessionCount: number & tags.Type<"int32">;

    /**
     * Optional human-readable summary of the logout-all result.
     *
     * The service may return either a non-null string with additional
     * context about the operation or `null` to indicate that no extra
     * message is provided beyond `success` and `affectedSessionCount`. API
     * producers should choose exactly one of these shapes for each
     * response, and clients should treat the absence of a non-null message
     * as an indication that no further explanation is available.
     */
    message?: string | null | undefined;
  };
}
