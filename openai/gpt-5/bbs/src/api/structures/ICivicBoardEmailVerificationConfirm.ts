import { tags } from "typia";

export namespace ICivicBoardEmailVerificationConfirm {
  /**
   * Request payload to confirm an administrator's email by consuming a
   * previously issued token from civic_board_email_verifications. Security
   * note: Only the token is accepted from the client; actor identity and
   * permissions are resolved server-side using the token linkage.
   * Implementations SHOULD treat this flow as idempotent (reusing an
   * already-consumed token yields a consistent outcome) and MAY apply rate
   * limiting for invalid attempts using civic_board_rate_limits.
   */
  export type ICreate = {
    /**
     * Opaque verification token string issued by
     * civic_board_email_verifications.token. The backend consumes this to
     * confirm email ownership for actor_type="admin" in this operation.
     */
    token: string & tags.MinLength<1>;
  };
}
