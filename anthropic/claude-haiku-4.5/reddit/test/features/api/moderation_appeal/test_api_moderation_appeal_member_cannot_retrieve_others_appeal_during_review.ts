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

export async function test_api_moderation_appeal_member_cannot_retrieve_others_appeal_during_review(
  connection: api.IConnection,
) {
  // Generate passwords for consistent use across join and login
  const member1Password = typia.random<string & tags.MinLength<8>>();
  const member2Password = typia.random<string & tags.MinLength<8>>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();

  // Step 1: Register first member (appeal creator)
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        username: RandomGenerator.alphaNumeric(8),
        password: member1Password,
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member1);

  // Step 2: Register second member (unauthorized viewer)
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        username: RandomGenerator.alphaNumeric(8),
        password: member2Password,
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member2);

  // Step 3: Register moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: moderatorPassword,
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 4: Create report decision to enable appeal
  const reportId = typia.random<string & tags.Format<"uuid">>();

  // Login as moderator to create decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
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
          action_type: "suspend_user",
          reason: "User violated community guidelines with harassment content",
          suspension_duration_days: 7,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 5: Submit appeal by first member
  // Login as first member
  await api.functional.auth.member.login(connection, {
    body: {
      email: member1Email,
      password: member1Password,
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
          appeal_reason: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
          supporting_evidence: "https://example.com/evidence",
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);
  TestValidator.equals(
    "appeal status should be submitted initially",
    appeal.appeal_status,
    "submitted",
  );

  // Step 6: Attempt unauthorized retrieval by second member
  // Login as second member
  await api.functional.auth.member.login(connection, {
    body: {
      email: member2Email,
      password: member2Password,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Try to retrieve appeal created by first member - should fail
  await TestValidator.error(
    "second member cannot retrieve first member's appeal during review",
    async () => {
      await api.functional.communityPlatform.member.moderationAppeals.at(
        connection,
        {
          appealId: appeal.id,
        },
      );
    },
  );

  // Step 7: Verify that first member (appellant) CAN retrieve their own appeal
  // Login as first member again
  await api.functional.auth.member.login(connection, {
    body: {
      email: member1Email,
      password: member1Password,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const ownAppeal: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.member.moderationAppeals.at(
      connection,
      {
        appealId: appeal.id,
      },
    );
  typia.assert(ownAppeal);
  TestValidator.equals(
    "appellant can retrieve their own appeal",
    ownAppeal.id,
    appeal.id,
  );
}
