import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAppeal";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

export async function test_api_moderation_appeal_update_missing_required_fields(
  connection: api.IConnection,
) {
  // Step 1: Create member account for appeal submission
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.name(),
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create first moderator for creating report decision
  const mod1Email = typia.random<string & tags.Format<"email">>();
  const mod1Password = RandomGenerator.alphaNumeric(12);
  const moderator1 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: mod1Email,
      username: RandomGenerator.name(),
      password: mod1Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator1);

  // Step 3: Create second moderator for reviewing appeal
  const mod2Email = typia.random<string & tags.Format<"email">>();
  const mod2Password = RandomGenerator.alphaNumeric(12);
  const moderator2 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: mod2Email,
      username: RandomGenerator.name(),
      password: mod2Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator2);

  // Step 4: Create a simulated report ID for decision
  const reportId = typia.random<string & tags.Format<"uuid">>();

  // Step 5: Create moderation decision on simulated report
  const decision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "remove_content",
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 6: Switch to member account and submit appeal
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const appeal =
    await api.functional.communityPlatform.member.moderationAppeals.create(
      connection,
      {
        body: {
          community_platform_report_decision_id: decision.id,
          appeal_reason: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);

  // Step 7: Switch to moderator2 account for reviewing
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: mod2Email,
      password: mod2Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 8: Test missing appeal_reviewer_id when transitioning to in_review
  await TestValidator.error(
    "should fail when appeal_reviewer_id missing for in_review transition",
    async () => {
      await api.functional.communityPlatform.moderator.moderationAppeals.update(
        connection,
        {
          appealId: appeal.id,
          body: {
            appeal_status: "in_review",
          } satisfies ICommunityPlatformModerationAppeal.IUpdate,
        },
      );
    },
  );

  // Step 9: Successfully transition to in_review with reviewer assigned
  const appealInReview =
    await api.functional.communityPlatform.moderator.moderationAppeals.update(
      connection,
      {
        appealId: appeal.id,
        body: {
          appeal_status: "in_review",
          appeal_reviewer_id: moderator2.id,
        } satisfies ICommunityPlatformModerationAppeal.IUpdate,
      },
    );
  typia.assert(appealInReview);
  TestValidator.equals(
    "appeal status should be in_review",
    appealInReview.appeal_status,
    "in_review",
  );

  // Step 10: Test missing appeal_outcome when transitioning to approved
  await TestValidator.error(
    "should fail when appeal_outcome missing for approved transition",
    async () => {
      await api.functional.communityPlatform.moderator.moderationAppeals.update(
        connection,
        {
          appealId: appeal.id,
          body: {
            appeal_status: "approved",
          } satisfies ICommunityPlatformModerationAppeal.IUpdate,
        },
      );
    },
  );

  // Step 11: Successfully transition to approved with outcome provided
  const appealApproved =
    await api.functional.communityPlatform.moderator.moderationAppeals.update(
      connection,
      {
        appealId: appeal.id,
        body: {
          appeal_status: "approved",
          appeal_outcome: "overturned_restore_content",
        } satisfies ICommunityPlatformModerationAppeal.IUpdate,
      },
    );
  typia.assert(appealApproved);
  TestValidator.equals(
    "appeal status should be approved",
    appealApproved.appeal_status,
    "approved",
  );
  TestValidator.equals(
    "appeal outcome should be set",
    appealApproved.appeal_outcome,
    "overturned_restore_content",
  );
}
