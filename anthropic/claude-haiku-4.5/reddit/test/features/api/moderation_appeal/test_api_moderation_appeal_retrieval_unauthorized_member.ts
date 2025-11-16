import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAppeal";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

export async function test_api_moderation_appeal_retrieval_unauthorized_member(
  connection: api.IConnection,
) {
  // Define passwords that will be reused across join and login operations
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const appellantPassword = RandomGenerator.alphaNumeric(12);
  const nonAppellantPassword = RandomGenerator.alphaNumeric(12);

  // Step 1: Create administrator account for system oversight
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "https://example.com/auth/admin/join",
        referrer: "https://example.com/auth",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create moderator account to make initial moderation decision
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: RandomGenerator.alphaNumeric(8),
        href: "https://example.com/auth/moderator/join",
        referrer: "https://example.com/auth",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 3: Create first member account (appellant who submits the appeal)
  const appellantEmail = typia.random<string & tags.Format<"email">>();
  const appellant: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: appellantEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: appellantPassword,
        href: "https://example.com/auth/member/join",
        referrer: "https://example.com/auth",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(appellant);

  // Step 4: Create second member account (non-appellant trying unauthorized access)
  const nonAppellantEmail = typia.random<string & tags.Format<"email">>();
  const nonAppellant: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: nonAppellantEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: nonAppellantPassword,
        href: "https://example.com/auth/member/join",
        referrer: "https://example.com/auth",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(nonAppellant);

  // Step 5: Create a post that will be reported
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 6: Submit a content violation report
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: "misinformation",
        additional_details: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);

  // Step 7: Switch to moderator account and create moderation decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/auth/moderator/login",
      referrer: "https://example.com/auth",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "remove_content",
          reason: "Content violates community misinformation policy guidelines",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 8: Switch back to appellant and submit appeal
  await api.functional.auth.member.login(connection, {
    body: {
      email: appellantEmail,
      password: appellantPassword,
      href: "https://example.com/auth/member/login",
      referrer: "https://example.com/auth",
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
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);

  // Step 9: Switch to non-appellant member
  await api.functional.auth.member.login(connection, {
    body: {
      email: nonAppellantEmail,
      password: nonAppellantPassword,
      href: "https://example.com/auth/member/login",
      referrer: "https://example.com/auth",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 10: Verify unauthorized member cannot retrieve appeal via admin endpoint
  await TestValidator.error(
    "non-appellant member cannot retrieve appeal",
    async () => {
      await api.functional.communityPlatform.administrator.moderationAppeals.at(
        connection,
        {
          appealId: appeal.id,
        },
      );
    },
  );

  // Step 11: Switch back to appellant and verify they can retrieve their own appeal
  await api.functional.auth.member.login(connection, {
    body: {
      email: appellantEmail,
      password: appellantPassword,
      href: "https://example.com/auth/member/login",
      referrer: "https://example.com/auth",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const retrievedAppeal: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.administrator.moderationAppeals.at(
      connection,
      {
        appealId: appeal.id,
      },
    );
  typia.assert(retrievedAppeal);
  TestValidator.equals(
    "retrieved appeal matches created appeal ID",
    retrievedAppeal.id,
    appeal.id,
  );
}
