import { tags } from "typia";

export namespace IEconDiscussVerifiedExpertPasswordReset {
  /**
   * Confirm password reset for a verified expert.
   *
   * This DTO finalizes the reset by replacing
   * econ_discuss_users.password_hash for the resolved account in the Actors
   * schema (Prisma model econ_discuss_users). It never accepts or returns
   * database‑managed identifiers or timestamps. Only the hashed credential is
   * stored; plaintext is discarded immediately after verification.
   */
  export type ICreate = {
    /**
     * Time‑limited password reset token issued by the provider.
     *
     * Validated server‑side and mapped to a specific econ_discuss_users.id.
     * Tokens are single‑use and expire per policy. Not stored in Prisma
     * tables defined here; typically managed by an out‑of‑band token
     * store.
     */
    token: string;

    /**
     * New credential to set for the target account.
     *
     * On success, the service writes a new secure hash into
     * econ_discuss_users.password_hash and refreshes
     * econ_discuss_users.updated_at (timestamptz). Plaintext must never be
     * persisted or returned in responses.
     */
    new_password: string & tags.MinLength<8> & tags.MaxLength<128>;
  };

  /**
   * Response wrapper for verified expert password reset confirmation.
   *
   * This object communicates the outcome of updating
   * econ_discuss_users.password_hash in the Actors schema (Prisma model
   * econ_discuss_users). It contains no sensitive data and never returns
   * credentials or token secrets. The occurred_at field can aid client UX and
   * auditing without exposing database internals.
   */
  export type IResult = {
    /**
     * Indicates whether the password reset confirmation completed
     * successfully.
     *
     * When true, the service has written a new hash to
     * econ_discuss_users.password_hash and updated
     * econ_discuss_users.updated_at.
     */
    success: boolean;

    /**
     * Optional human‑readable message describing the outcome.
     *
     * Intended for UX display (e.g., "Password reset completed" or a
     * generic failure notice that avoids account enumeration).
     */
    message?: string | undefined;

    /**
     * Server‑side timestamp (ISO 8601, UTC recommended) recording when the
     * reset operation was processed.
     *
     * This is a response convenience value; underlying Prisma timestamps
     * affected include econ_discuss_users.updated_at when the reset
     * succeeds.
     */
    occurred_at?: (string & tags.Format<"date-time">) | undefined;
  };
}
