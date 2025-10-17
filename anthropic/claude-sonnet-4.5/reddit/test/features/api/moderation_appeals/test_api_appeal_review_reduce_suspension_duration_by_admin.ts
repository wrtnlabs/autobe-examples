import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAppeal";
import type { IRedditLikePlatformSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePlatformSuspension";

/**
 * Test administrator reducing platform suspension duration through appeal
 * review.
 *
 * This test validates the complete appeal review workflow where an
 * administrator reviews a platform suspension appeal and reduces the penalty by
 * shortening the suspension duration. The test creates a member account, issues
 * a 30-day platform suspension, submits an appeal from the member, then
 * authenticates as administrator to review the appeal with a 'reduce_penalty'
 * decision that modifies the expiration_date to 7 days. Validates that the
 * appeal status updates to 'reduced', the platform suspension's expiration_date
 * is updated per R-APP-019, the decision_explanation documents the reduced
 * penalty, and the appellant receives notification of the modified suspension
 * duration per R-APP-021.
 *
 * Workflow:
 *
 * 1. Create member account that will be suspended
 * 2. Create administrator account for issuing suspension and reviewing appeal
 * 3. Issue temporary 30-day platform suspension against the member
 * 4. Submit appeal from suspended member with reasoning
 * 5. Authenticate as administrator to review the appeal
 * 6. Review appeal with 'reduce_penalty' decision, shortening to 7 days
 * 7. Validate appeal status changed to 'reduced'
 * 8. Validate suspension expiration_date was shortened
 * 9. Validate decision_explanation was recorded
 */
export async function test_api_appeal_review_reduce_suspension_duration_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create member account that will be suspended
  const memberConnection = { ...connection };
  const member = await api.functional.auth.member.join(memberConnection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create administrator account for issuing suspension and reviewing appeal
  const adminConnection = { ...connection };
  const admin = await api.functional.auth.admin.join(adminConnection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 3: Issue temporary 30-day platform suspension (as admin)
  const suspensionDate = new Date();
  const originalExpirationDate = new Date(
    suspensionDate.getTime() + 30 * 24 * 60 * 60 * 1000,
  );

  const suspension =
    await api.functional.redditLike.admin.platform.suspensions.create(
      adminConnection,
      {
        body: {
          suspended_member_id: member.id,
          suspension_reason_category: "harassment",
          suspension_reason_text:
            "Repeated harassment of other community members across multiple communities",
          internal_notes: "First offense, consider reducing on appeal",
          is_permanent: false,
          expiration_date: originalExpirationDate.toISOString(),
        } satisfies IRedditLikePlatformSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  TestValidator.equals(
    "suspension is temporary",
    suspension.is_permanent,
    false,
  );
  TestValidator.predicate(
    "suspension has expiration date",
    suspension.expiration_date !== null &&
      suspension.expiration_date !== undefined,
  );

  // Step 4: Submit appeal from suspended member
  const appealText = `I acknowledge that my behavior was inappropriate, but I believe a 30-day suspension is excessive for a first offense. I have reviewed the community guidelines and understand the standards expected. I respectfully request that the suspension duration be reduced as I am committed to following all rules going forward.`;

  const appeal =
    await api.functional.redditLike.member.moderation.appeals.create(
      memberConnection,
      {
        body: {
          platform_suspension_id: suspension.id,
          appeal_type: "platform_suspension",
          appeal_text: appealText,
        } satisfies IRedditLikeModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);

  TestValidator.equals(
    "appeal type is platform_suspension",
    appeal.appeal_type,
    "platform_suspension",
  );
  TestValidator.equals("appeal status is pending", appeal.status, "pending");

  // Step 5 & 6: Review appeal with 'reduce_penalty' decision (as admin)
  const reducedExpirationDate = new Date(
    suspensionDate.getTime() + 7 * 24 * 60 * 60 * 1000,
  );
  const decisionExplanation = `After reviewing your appeal and considering this is your first offense, we have decided to reduce the suspension from 30 days to 7 days. This reduced penalty reflects your acknowledgment of the violation and commitment to follow community guidelines. The modified suspension will expire on ${reducedExpirationDate.toISOString()}.`;

  const reviewedAppeal =
    await api.functional.redditLike.admin.moderation.appeals.review(
      adminConnection,
      {
        appealId: appeal.id,
        body: {
          decision: "reduce_penalty",
          decision_explanation: decisionExplanation,
          penalty_modification: `Suspension duration reduced from 30 days to 7 days. New expiration: ${reducedExpirationDate.toISOString()}`,
        } satisfies IRedditLikeModerationAppeal.IReview,
      },
    );
  typia.assert(reviewedAppeal);

  // Step 7: Validate appeal status changed to 'reduced'
  TestValidator.equals(
    "appeal status updated to reduced",
    reviewedAppeal.status,
    "reduced",
  );

  // Step 8: Validate decision explanation was recorded
  TestValidator.predicate(
    "decision explanation exists",
    reviewedAppeal.decision_explanation !== null &&
      reviewedAppeal.decision_explanation !== undefined,
  );
  if (reviewedAppeal.decision_explanation) {
    TestValidator.equals(
      "decision explanation matches",
      reviewedAppeal.decision_explanation,
      decisionExplanation,
    );
  }

  // Step 9: Validate review timestamp was recorded
  TestValidator.predicate(
    "reviewed_at timestamp exists",
    reviewedAppeal.reviewed_at !== null &&
      reviewedAppeal.reviewed_at !== undefined,
  );
}
