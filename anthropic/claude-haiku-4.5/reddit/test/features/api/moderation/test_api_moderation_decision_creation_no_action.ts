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

export async function test_api_moderation_decision_creation_no_action(
  connection: api.IConnection,
) {
  // 1. Create a member account whose content will be reported
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(12),
      href: "https://community.example.com/auth/register",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. Create a post (compliant content)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: communityId,
        post_type: "text",
        title: "Community Guidelines Compliant Post",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 3. Create a report on the compliant content
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        reported_post_id: post.id,
        category: "off_topic",
        additional_details: "This post seems off-topic for this community",
        reporter_contact_email: memberEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);

  // 4. Authenticate as a moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(12),
      href: "https://community.example.com/auth/register",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // 5. Create moderation decision with action_type 'no_action'
  const decision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "no_action",
          reason:
            "Content review completed. This post does not violate community standards and is appropriate for the platform.",
          internal_notes:
            "Reviewed by moderator - content is compliant with all community guidelines",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // 6. Verify the decision details
  TestValidator.equals(
    "decision action type is no_action",
    decision.action_type,
    "no_action",
  );
  TestValidator.predicate(
    "decision reason has minimum length",
    decision.reason.length >= 10,
  );
  TestValidator.equals(
    "decision is linked to correct report",
    decision.report.id,
    report.id,
  );
  TestValidator.equals(
    "moderator is recorded in decision",
    decision.moderator.id,
    moderator.id,
  );
  TestValidator.predicate(
    "decision has creation timestamp",
    decision.created_at !== null && decision.created_at !== undefined,
  );
}
