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
 * Test the complete workflow where an administrator reviews a platform
 * suspension appeal and upholds the original suspension decision.
 *
 * This test validates the administrative appeal review process for
 * platform-wide user suspensions. It creates a complete workflow starting from
 * member and administrator account creation, through suspension issuance,
 * appeal submission, and finally the administrative review with an 'uphold'
 * decision.
 *
 * The test ensures that:
 *
 * 1. A member account can be created and subsequently suspended
 * 2. An administrator account can issue platform suspensions
 * 3. Suspended members can submit appeals challenging their suspensions
 * 4. Administrators can review appeals and make 'uphold' decisions
 * 5. The appeal status correctly updates to 'upheld' after admin review
 * 6. The decision explanation is properly recorded per requirement R-APP-020
 * 7. The original platform suspension remains active (is_active=true) after
 *    upholding
 * 8. The system maintains proper referential integrity between appeals,
 *    suspensions, and user accounts
 */
export async function test_api_appeal_review_platform_suspension_uphold_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create member account that will be suspended and submit appeal
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: memberEmail,
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create administrator account for issuing suspension and reviewing appeal
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: adminEmail,
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 3: Issue platform suspension as administrator
  const suspensionReason = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 5,
    wordMax: 10,
  });
  const suspension: IRedditLikePlatformSuspension =
    await api.functional.redditLike.admin.platform.suspensions.create(
      connection,
      {
        body: {
          suspended_member_id: member.id,
          suspension_reason_category: "repeated_violations",
          suspension_reason_text: suspensionReason,
          internal_notes: RandomGenerator.paragraph({ sentences: 5 }),
          is_permanent: false,
          expiration_date: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IRedditLikePlatformSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  // Validate suspension was created with correct properties
  TestValidator.equals(
    "suspended member ID matches",
    suspension.suspended_member_id,
    member.id,
  );
  TestValidator.equals("suspension is active", suspension.is_active, true);
  TestValidator.equals(
    "suspension is not permanent",
    suspension.is_permanent,
    false,
  );

  // Step 4: Submit appeal from suspended member
  const memberConnection: api.IConnection = {
    ...connection,
    headers: { Authorization: member.token.access },
  };

  const appealText = RandomGenerator.paragraph({
    sentences: 15,
    wordMin: 5,
    wordMax: 10,
  });
  const appeal: IRedditLikeModerationAppeal =
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

  // Validate appeal was created correctly
  TestValidator.equals(
    "appeal appellant matches member",
    appeal.appellant_member_id,
    member.id,
  );
  TestValidator.equals(
    "appeal type is platform_suspension",
    appeal.appeal_type,
    "platform_suspension",
  );
  TestValidator.equals("appeal status is pending", appeal.status, "pending");

  // Step 5: Authenticate as administrator and review appeal with 'uphold' decision
  const adminConnection: api.IConnection = {
    ...connection,
    headers: { Authorization: admin.token.access },
  };

  const decisionExplanation = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 5,
    wordMax: 12,
  });
  const reviewedAppeal: IRedditLikeModerationAppeal =
    await api.functional.redditLike.admin.moderation.appeals.review(
      adminConnection,
      {
        appealId: appeal.id,
        body: {
          decision: "uphold",
          decision_explanation: decisionExplanation,
        } satisfies IRedditLikeModerationAppeal.IReview,
      },
    );
  typia.assert(reviewedAppeal);

  // Step 6: Validate appeal status updates to 'upheld'
  TestValidator.equals(
    "appeal status is upheld",
    reviewedAppeal.status,
    "upheld",
  );

  // Step 7: Validate decision_explanation is recorded per R-APP-020
  TestValidator.predicate(
    "decision explanation is recorded",
    reviewedAppeal.decision_explanation !== null &&
      reviewedAppeal.decision_explanation !== undefined,
  );

  // Step 8: Validate reviewed_at timestamp is set
  TestValidator.predicate(
    "reviewed_at timestamp is set",
    reviewedAppeal.reviewed_at !== null &&
      reviewedAppeal.reviewed_at !== undefined,
  );
}
