import { tags } from "typia";

export namespace ICivicBoardEmailVerificationOfUser {
  /**
   * Request payload for issuing or re-sending an email verification token for
   * the currently authenticated member. Used by POST
   * /auth/user/email/verify/request.
   *
   * Security: The authenticated user identity comes from the session/JWT;
   * clients MUST NOT provide user identifiers. The backend inserts a row into
   * civic_board_email_verifications (actor_type = "user") and links it via
   * civic_board_email_verification_of_users to the current
   * civic_board_users.id.
   *
   * Prisma reference: civic_board_email_verifications,
   * civic_board_email_verification_of_users.
   */
  export type IRequest = {
    /**
     * Optional delivery hints used by the server to orchestrate how the
     * verification email is dispatched. The server reads the recipient from
     * civic_board_users.email; these hints only guide presentation and
     * routing.
     */
    delivery?: ICivicBoardEmailVerificationOfUser.IDelivery | undefined;
  };

  /**
   * Delivery hint object for verification issuance. These values are
   * transient and do not map directly to a Prisma model; issuance writes are
   * performed to civic_board_email_verifications and linked via
   * civic_board_email_verification_of_users.
   */
  export type IDelivery = {
    /**
     * Preferred delivery channel. For civicBoard MVP this is fixed to
     * "email".
     */
    channel?: ICivicBoardEmailVerificationOfUser.IEDeliveryChannel | undefined;

    /** BCP 47 language tag for template localization (e.g., "en-US"). */
    locale?: string | undefined;

    /**
     * Optional current page URL from which the request originates. Useful
     * for template links or analytics.
     */
    href?: (string & tags.Format<"uri">) | undefined;

    /**
     * Optional referrer URL captured by the client for analytics and
     * template phrasing. May be an empty string when the user arrives
     * directly (no referrer).
     */
    referrer?: (string & tags.Format<"uri">) | "" | undefined;
  };

  /**
   * Delivery channel options for verification communications. The minimal
   * release supports only "email".
   *
   * - Email: Use civic_board_users.email to deliver the verification link.
   */
  export type IEDeliveryChannel = "email";

  /**
   * Union response type used by email verification flows. Represents either:
   *
   * - Issuance acknowledgement
   *   (ICivicBoardUserEmailVerification.IIssue.ISummary) returned by POST
   *   /auth/user/email/verify/request, or
   * - Confirmation outcome (ICivicBoardUserEmailVerification.IConfirm.ISummary)
   *   returned by POST /auth/user/email/verify/confirm.
   *
   * This union aligns the schema with operation usage while keeping each
   * variant self-descriptive.
   */
  export type ISummary =
    | ICivicBoardEmailVerificationOfUser.IIssue.ISummary
    | ICivicBoardEmailVerificationOfUser.IConfirm.ISummary;

  /**
   * Request DTO to confirm a member's email by consuming a verification
   * token. The service will locate a row in civic_board_email_verifications
   * (actor_type = "user", token match, not expired, not used), set used =
   * true and used_at = now, then follow the specialization
   * civic_board_email_verification_of_users to update the associated
   * civic_board_users row (email_verified = true). This endpoint is public
   * and returns generic errors to avoid disclosing account existence. No
   * authentication or actor IDs are accepted in this body.
   */
  export type IConfirm = {
    /**
     * Opaque verification token string copied from the email link. This
     * value maps to civic_board_email_verifications.token and is
     * case-sensitive. The backend verifies actor_type = "user", ensures
     * expires_at is in the future, and that used = false before consuming
     * the token.
     */
    token: string & tags.MinLength<1>;
  };
  export namespace IConfirm {
    /**
     * Confirmation outcome for user email verification. Returned by POST
     * /auth/user/email/verify/confirm after consuming a valid token from
     * civic_board_email_verifications via
     * civic_board_email_verification_of_users.
     *
     * Contract notes:
     *
     * - When verified = true, verified_at is required and provides the UTC
     *   timestamp of confirmation.
     * - When verified = false, verified_at MAY be omitted or null; a
     *   descriptive message SHOULD be provided to indicate an outcome such
     *   as invalid/expired/already-used token or already verified account.
     *
     * This DTO contains no token material or sensitive identifiers and is
     * independent of direct Prisma row mapping.
     */
    export type ISummary = any | any;
  }

  export namespace IIssue {
    /**
     * Acknowledgement payload for email verification token issuance
     * returned by POST /auth/user/email/verify/request.
     *
     * Security: Does NOT include the secret token. Prisma linkage on
     * success: civic_board_email_verifications (actor_type = "user")
     * specialized via civic_board_email_verification_of_users.
     *
     * Contract notes:
     *
     * - When issued = true, expires_at is REQUIRED and indicates the token
     *   expiry time.
     * - When issued = false, providers MAY set already_verified = true to
     *   indicate no issuance.
     *
     * Usage Note: This schema is intended for the issuance endpoint only.
     */
    export type ISummary = any | any;
  }
}
