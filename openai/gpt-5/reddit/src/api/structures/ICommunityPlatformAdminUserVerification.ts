import { tags } from "typia";

import { IEAdminVerificationStatus } from "./IEAdminVerificationStatus";

export namespace ICommunityPlatformAdminUserVerification {
  /**
   * Verification result summary for administrator email verification and
   * resend flows.
   *
   * This DTO is used by endpoints that confirm an admin’s email or re-send a
   * verification message. It does not directly correspond to a Prisma model;
   * rather, it reflects the effect of operations that read/update
   * community_platform_users (notably email_verified and account_state) as
   * described in the Prisma schema comments. The summary conveys a safe
   * subset of information suitable for clients without exposing sensitive
   * details.
   *
   * Security and privacy: The object intentionally avoids personally
   * identifying fields (such as email) and should be localized for end users
   * while the stable programmatic status values remain language-neutral.
   */
  export type ISummary = {
    /**
     * Operation success indicator.
     *
     * True when the verification workflow step completed successfully
     * (e.g., email verified or verification email re-sent). False when
     * processed but unable to complete the intended action (e.g., resend
     * throttled). Fatal errors should be returned via the standardized
     * error model rather than this summary object.
     */
    ok: boolean;

    /**
     * Outcome category for the verification-related action.
     *
     * Uses IEAdminVerificationStatus to provide a compact, programmatic
     * result suitable for client branching.
     */
    status: IEAdminVerificationStatus;

    /**
     * Human-readable description of the outcome.
     *
     * Provides concise, user-facing context (for example, "Verification
     * email sent.", "Email already verified.", or "Email verification
     * completed."). Avoid sensitive details and adhere to localization and
     * accessibility guidance.
     */
    message: string;

    /**
     * Optional throttling hint for resend flows.
     *
     * Indicates the earliest retry window in seconds when a resend is
     * rate-limited. Omit when not applicable. Not persisted in Prisma;
     * computed at runtime from policy and recent activity.
     */
    retry_after_seconds?:
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | undefined;
  };
}
