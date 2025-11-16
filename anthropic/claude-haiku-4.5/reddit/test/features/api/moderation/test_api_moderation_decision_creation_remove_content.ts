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

export async function test_api_moderation_decision_creation_remove_content(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: "SecurePassword123!",
        href: "https://example.com/auth/moderator/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: "SecurePassword123!",
        href: "https://example.com/auth/member/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create a post that violates community standards
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        post_type: "text",
        title: "Inappropriate Content Title",
        content_text: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 4: Switch to member and submit report on the post
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "SecurePassword123!",
      href: "https://example.com/auth/member/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: "hate_speech",
        additional_details:
          "This post contains offensive language and violates community standards.",
        reporter_contact_email: memberEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);

  // Step 5: Switch to moderator and create decision to remove content
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "SecurePassword123!",
      href: "https://example.com/auth/moderator/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "remove_content",
          reason:
            "This post violates our community standards regarding hate speech and offensive content. The post contains language that is harmful and not permitted on our platform.",
          internal_notes:
            "User is repeat offender. Consider issuing warning on next violation.",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 6: Validate decision structure and fields
  TestValidator.equals(
    "decision action_type should be remove_content",
    decision.action_type,
    "remove_content",
  );

  TestValidator.predicate(
    "decision reason should have minimum 10 characters",
    decision.reason.length >= 10,
  );

  TestValidator.predicate(
    "decision should have moderator assignment",
    decision.moderator !== null && decision.moderator !== undefined,
  );

  TestValidator.predicate(
    "decision should have report context",
    decision.report !== null && decision.report !== undefined,
  );

  TestValidator.equals(
    "decision report ID should match submitted report",
    decision.report.id,
    report.id,
  );

  TestValidator.predicate(
    "decision should have created_at timestamp",
    decision.created_at !== null && decision.created_at !== undefined,
  );

  TestValidator.predicate(
    "decision should have updated_at timestamp",
    decision.updated_at !== null && decision.updated_at !== undefined,
  );

  TestValidator.predicate(
    "moderator should be properly attributed",
    decision.moderator.id !== null && decision.moderator.username !== null,
  );

  // Step 7: Validate reason is stored for transparency
  TestValidator.predicate(
    "decision reason should be visible for transparency",
    decision.reason.includes("violates"),
  );

  TestValidator.predicate(
    "decision should not have suspension duration since action is remove_content",
    decision.suspension_duration_days === null ||
      decision.suspension_duration_days === undefined,
  );
}
