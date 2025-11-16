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

export async function test_api_moderation_appeal_retrieval_appeal_privacy_during_review(
  connection: api.IConnection,
) {
  // Step 1: Create a member (appellant) who will submit the appeal
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(),
        password: "TestPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create first moderator to make initial content moderation decision
  const mod1Email = typia.random<string & tags.Format<"email">>();
  const mod1: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: mod1Email,
        username: RandomGenerator.name(),
        password: "ModPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(mod1);

  // Step 3: Create second moderator to verify they cannot view in_review appeal
  const mod2Email = typia.random<string & tags.Format<"email">>();
  const mod2: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: mod2Email,
        username: RandomGenerator.name(),
        password: "ModPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(mod2);

  // Step 4: Create a report and make a moderation decision on it
  // First, we need to simulate a report being created and then make a decision
  // Since we don't have direct report creation, we'll work with the decision creation
  const reportId = typia.random<string & tags.Format<"uuid">>();

  // Switch to mod1 to create a decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: mod1Email,
      password: "ModPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "issue_warning",
          reason:
            "This is a test moderation decision with sufficient length requirement",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 5: Switch to member and submit an appeal
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const appeal: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.member.moderationAppeals.create(
      connection,
      {
        body: {
          community_platform_report_decision_id: decision.id,
          appeal_reason:
            "I believe this decision was made in error and I would like it to be reconsidered by an independent reviewer",
          supporting_evidence: "https://example.com/evidence",
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);
  TestValidator.equals(
    "appeal should be in submitted status initially",
    appeal.appeal_status,
    "submitted",
  );

  // Step 6: Switch to mod1 and transition appeal to in_review status with mod1 as reviewer
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: mod1Email,
      password: "ModPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const appealInReview: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.moderator.moderationAppeals.update(
      connection,
      {
        appealId: appeal.id,
        body: {
          appeal_status: "in_review",
          appeal_reviewer_id: mod1.id,
        } satisfies ICommunityPlatformModerationAppeal.IUpdate,
      },
    );
  typia.assert(appealInReview);
  TestValidator.equals(
    "appeal status should be in_review",
    appealInReview.appeal_status,
    "in_review",
  );

  // Step 7: Verify mod1 (assigned reviewer) can view the appeal
  const appealViewByMod1: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.moderationAppeals.at(connection, {
      appealId: appeal.id,
    });
  typia.assert(appealViewByMod1);
  TestValidator.equals(
    "mod1 should see the appeal they are assigned to",
    appealViewByMod1.id,
    appeal.id,
  );

  // Step 8: Verify mod2 (non-assigned moderator) cannot view the appeal
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: mod2Email,
      password: "ModPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Attempt to view the appeal - should fail with 403 or permission error
  await TestValidator.error(
    "mod2 should not be able to view appeal assigned to mod1",
    async () => {
      await api.functional.communityPlatform.moderationAppeals.at(connection, {
        appealId: appeal.id,
      });
    },
  );

  // Step 9: Switch back to appellant and verify they can view their own appeal
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const appealViewByAppellant: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.moderationAppeals.at(connection, {
      appealId: appeal.id,
    });
  typia.assert(appealViewByAppellant);
  TestValidator.equals(
    "appellant should be able to view their own appeal",
    appealViewByAppellant.id,
    appeal.id,
  );
  TestValidator.equals(
    "appellant should see the appeal is in_review",
    appealViewByAppellant.appeal_status,
    "in_review",
  );

  // Step 10: Verify appeal privacy is maintained
  TestValidator.predicate(
    "appeal should have reviewer information when in_review",
    appealViewByAppellant.reviewer !== null &&
      appealViewByAppellant.reviewer !== undefined,
  );
  TestValidator.equals(
    "reviewer should be mod1",
    appealViewByAppellant.reviewer?.id,
    mod1.id,
  );
}
