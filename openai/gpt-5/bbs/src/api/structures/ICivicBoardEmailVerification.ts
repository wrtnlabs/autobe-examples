import { tags } from "typia";

import { IECivicBoardActorType } from "./IECivicBoardActorType";

export namespace ICivicBoardEmailVerification {
  /**
   * Request DTO to issue an email verification token for the currently
   * authenticated admin. Server creates a row in
   * civic_board_email_verifications (actor_type = "admin", email, token,
   * expires_at, used = false) and links it via
   * civic_board_email_verification_of_admins
   * (civic_board_email_verification_id, civic_board_admin_id). No actor
   * identifiers or email should be supplied by the client—these are derived
   * from the authenticated admin (JWT) and the admin’s record in
   * civic_board_admins. This DTO now optionally carries delivery hints
   * (channel/locale/href/referrer) for parity with the user variant; rate
   * limiting may be enforced via civic_board_rate_limits and audit entries
   * may be written to civic_board_audit_logs.
   */
  export type ICreate = {
    /**
     * Optional delivery hints for issuing the admin email verification
     * message. Identity and recipient email are derived from the
     * authenticated admin; this object only guides presentation and
     * routing.
     */
    delivery?: ICivicBoardEmailVerification.IDelivery | undefined;
  };

  /**
   * Summary view of an email verification token as stored in
   * civic_board_email_verifications. Excludes sensitive fields (e.g., the
   * secret token value) while exposing lifecycle attributes required for
   * administrative or audit contexts. Adds optional lifecycle columns
   * (used_at, updated_at, deleted_at) to accurately reflect the entity state
   * without compromising security.
   */
  export type ISummary = {
    /** Primary Key. Maps to civic_board_email_verifications.id (UUID). */
    id: string & tags.Format<"uuid">;

    /**
     * Discriminator indicating which actor type this verification targets
     * ("user" | "admin"). Mirrors
     * civic_board_email_verifications.actor_type.
     */
    actor_type: IECivicBoardActorType;

    /**
     * Email address captured at token issuance. Mirrors
     * civic_board_email_verifications.email; used for audit and delivery
     * traceability.
     */
    email: string & tags.Format<"email">;

    /**
     * Token expiration timestamp in UTC. Mirrors
     * civic_board_email_verifications.expires_at. Tokens are invalid after
     * this time.
     */
    expires_at: string & tags.Format<"date-time">;

    /**
     * Whether the verification token has been consumed. Mirrors
     * civic_board_email_verifications.used.
     */
    used: boolean;

    /**
     * Timestamp when the token was consumed, if applicable. Mirrors
     * civic_board_email_verifications.used_at (UTC).
     */
    used_at?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Creation timestamp (UTC) when the verification token row was
     * inserted. Mirrors civic_board_email_verifications.created_at.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Last update timestamp (UTC) for the verification token record.
     * Mirrors civic_board_email_verifications.updated_at.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Soft deletion timestamp (UTC) for retention or legal hold workflows.
     * Mirrors civic_board_email_verifications.deleted_at; null when
     * active.
     */
    deleted_at?: (string & tags.Format<"date-time">) | null | undefined;
  };

  /**
   * Delivery hint object for administrator email verification issuance.
   * Identity (recipient) is derived from the authenticated admin; these hints
   * guide presentation and routing only. Values do not map directly to
   * Prisma. Issuance writes occur in civic_board_email_verifications and link
   * via civic_board_email_verification_of_admins.
   */
  export type IDelivery = {
    /**
     * Preferred delivery channel. For civicBoard MVP this is fixed to
     * "email".
     */
    channel?: ICivicBoardEmailVerification.IEDeliveryChannel | undefined;

    /**
     * Optional BCP 47 language tag for template localization (e.g.,
     * "en-US"). Used only as a hint for presentation; does not affect token
     * issuance or validation.
     */
    locale?: (string & tags.MinLength<2> & tags.MaxLength<35>) | undefined;

    /**
     * Optional current page URL from which the request originates. Useful
     * for template links or analytics.
     */
    href?:
      | (string &
          tags.MinLength<1> &
          tags.MaxLength<80000> &
          tags.Format<"uri">)
      | undefined;

    /**
     * Optional referrer URL captured by the client for analytics and
     * template phrasing. May be an empty string when the admin arrives
     * directly (no referrer).
     */
    referrer?:
      | (string &
          tags.MinLength<1> &
          tags.MaxLength<80000> &
          tags.Format<"uri">)
      | ""
      | undefined;
  };

  /**
   * Delivery channel options for verification communications. The minimal
   * release supports only "email".
   *
   * - Email: Use civic_board_admins.email to deliver the verification link.
   */
  export type IEDeliveryChannel = "email";
}
