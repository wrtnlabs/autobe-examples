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

export async function test_api_moderation_decision_creation_approve_content(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        href: "http://localhost:3000/auth/moderator/join",
        referrer: "http://localhost:3000/auth",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create member account (poster)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberConnection = { ...connection, headers: {} };
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(memberConnection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        href: "http://localhost:3000/auth/member/join",
        referrer: "http://localhost:3000/auth",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create a compliant post
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(
      memberConnection,
      {
        body: {
          community_id: typia.random<string & tags.Format<"uuid">>(),
          post_type: "text",
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content_text: RandomGenerator.content({ paragraphs: 2 }),
          is_nsfw: false,
          has_spoiler: false,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(post);

  // Step 4: Submit report on the compliant post
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(
      memberConnection,
      {
        body: {
          reported_post_id: post.id,
          category: "spam",
          additional_details: RandomGenerator.paragraph({ sentences: 2 }),
          reporter_contact_email: memberEmail,
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert(report);

  // Step 5: Create moderation decision approving the content
  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "no_action",
          reason:
            "After careful review, this post complies with community standards and does not violate any policies. Content is appropriate and does not constitute spam.",
          internal_notes:
            "Post checked against spam indicators: no suspicious links, no repetitive content, authentic community contribution.",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 6: Validate decision properties
  TestValidator.equals(
    "decision action type should be no_action",
    decision.action_type,
    "no_action",
  );
  TestValidator.predicate(
    "decision reason should be descriptive",
    decision.reason.length >= 10,
  );
  TestValidator.predicate(
    "decision should have valid moderator",
    decision.moderator !== null && decision.moderator !== undefined,
  );
  TestValidator.equals(
    "decision should reference correct report",
    decision.report.id,
    report.id,
  );
  TestValidator.predicate(
    "decision timestamp should be set",
    decision.created_at !== null && decision.created_at !== undefined,
  );
}
