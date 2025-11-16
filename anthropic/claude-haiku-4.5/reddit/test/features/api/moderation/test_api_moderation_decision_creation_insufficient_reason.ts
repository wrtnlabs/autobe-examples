import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

export async function test_api_moderation_decision_creation_insufficient_reason(
  connection: api.IConnection,
) {
  // 1. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: moderatorPassword,
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create member account for reporter
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporterPassword = RandomGenerator.alphaNumeric(12);
  const reporter: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: reporterEmail,
        username: RandomGenerator.alphabets(8),
        password: reporterPassword,
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(reporter);

  // 3. Create another member account (the user being reported)
  const reportedUserEmail = typia.random<string & tags.Format<"email">>();
  const reportedUserPassword = RandomGenerator.alphaNumeric(12);
  const reportedUser: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: reportedUserEmail,
        username: RandomGenerator.alphabets(8),
        password: reportedUserPassword,
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(reportedUser);

  // 4. Create a post by the reported user
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 5. Switch to reporter and create a report
  await api.functional.auth.member.login(connection, {
    body: {
      email: reporterEmail,
      password: reporterPassword,
      href: "https://community.example.com/auth/login",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: "spam",
        additional_details: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);

  // 6. Switch to moderator account
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://community.example.com/auth/login",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 7. Attempt to create decision with 9-character reason (should fail)
  const insufficientReason = RandomGenerator.alphabets(9);
  await TestValidator.error(
    "moderation decision with 9-character reason should fail validation",
    async () => {
      await api.functional.communityPlatform.moderator.reports.decision.create(
        connection,
        {
          reportId: report.id,
          body: {
            action_type: "remove_content",
            reason: insufficientReason,
          } satisfies ICommunityPlatformReportDecision.ICreate,
        },
      );
    },
  );

  // 8. Create decision with exactly 10-character reason (should succeed)
  const sufficientReason = RandomGenerator.alphabets(10);
  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "remove_content",
          reason: sufficientReason,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // 9. Verify decision was created successfully with boundary validation
  TestValidator.equals(
    "decision action type should be remove_content",
    decision.action_type,
    "remove_content",
  );
  TestValidator.equals(
    "decision reason matches input with exactly 10 characters",
    decision.reason,
    sufficientReason,
  );
  TestValidator.predicate(
    "decision reason length is at least 10 characters",
    decision.reason.length >= 10,
  );
}
