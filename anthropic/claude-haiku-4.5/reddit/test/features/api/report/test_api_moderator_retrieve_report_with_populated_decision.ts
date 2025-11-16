import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

export async function test_api_moderator_retrieve_report_with_populated_decision(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account to set up initial data
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: "Admin@12345",
      username: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      href: "https://example.com/auth",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create category for community
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphaNumeric(10).toLowerCase(),
          display_order: 1,
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account for posting content
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(12),
      password: "Member@12345",
      href: "https://example.com/auth",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          identifier: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create a post to be reported
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 6: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphaNumeric(12),
      password: "Moderator@12345",
      href: "https://example.com/auth",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 7: Create a report against the post
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        reported_post_id: post.id,
        category: "hate_speech",
        additional_details: RandomGenerator.paragraph(),
        reporter_contact_email: typia.random<string & tags.Format<"email">>(),
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);

  // Step 8: Switch to moderator account to retrieve the report
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "Moderator@12345",
      href: "https://example.com/auth",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 9: Retrieve the report with decision information
  const retrievedReport =
    await api.functional.communityPlatform.moderator.reports.at(connection, {
      reportId: report.id,
    });
  typia.assert(retrievedReport);

  // Step 10: Validate report structure and properties
  TestValidator.equals("report ID matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "report category matches",
    retrievedReport.category,
    "hate_speech",
  );
  TestValidator.predicate(
    "report has reporter information",
    retrievedReport.reporter !== null && retrievedReport.reporter !== undefined,
  );
  TestValidator.predicate(
    "report has reported post",
    retrievedReport.reported_post !== null &&
      retrievedReport.reported_post !== undefined,
  );

  // Step 11: Validate decision metrics are tracked
  TestValidator.predicate(
    "decisions_count is defined and non-negative",
    retrievedReport.decisions_count !== undefined &&
      retrievedReport.decisions_count >= 0,
  );
  TestValidator.predicate(
    "warnings_issued_count is defined and non-negative",
    retrievedReport.warnings_issued_count !== undefined &&
      retrievedReport.warnings_issued_count >= 0,
  );
  TestValidator.predicate(
    "suspensions_count is defined and non-negative",
    retrievedReport.suspensions_count !== undefined &&
      retrievedReport.suspensions_count >= 0,
  );
  TestValidator.predicate(
    "bans_count is defined and non-negative",
    retrievedReport.bans_count !== undefined && retrievedReport.bans_count >= 0,
  );

  // Step 12: Validate timestamps are present
  TestValidator.predicate(
    "created_at timestamp exists",
    retrievedReport.created_at !== null &&
      retrievedReport.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    retrievedReport.updated_at !== null &&
      retrievedReport.updated_at !== undefined,
  );

  // Step 13: Validate report status reflects investigation state
  TestValidator.predicate(
    "status is one of valid workflow states",
    [
      "submitted",
      "in_review",
      "pending_decision",
      "resolved",
      "dismissed",
    ].includes(retrievedReport.status),
  );

  // Step 14: Validate priority level is assigned
  TestValidator.predicate(
    "priority is one of valid levels",
    ["critical", "high", "medium", "low"].includes(retrievedReport.priority),
  );

  // Step 15: If decision is populated, validate decision structure
  if (
    retrievedReport.decision !== null &&
    retrievedReport.decision !== undefined
  ) {
    typia.assert(retrievedReport.decision);
    TestValidator.predicate(
      "decision has action_type",
      [
        "no_action",
        "remove_content",
        "issue_warning",
        "suspend_user",
        "ban_user",
        "escalate",
      ].includes(retrievedReport.decision.action_type),
    );
    TestValidator.predicate(
      "decision has reason",
      retrievedReport.decision.reason !== null &&
        retrievedReport.decision.reason !== undefined &&
        retrievedReport.decision.reason.length >= 10,
    );
    TestValidator.predicate(
      "decision has moderator information",
      retrievedReport.decision.moderator !== null &&
        retrievedReport.decision.moderator !== undefined,
    );
    TestValidator.predicate(
      "decision has timestamps",
      retrievedReport.decision.created_at !== null &&
        retrievedReport.decision.created_at !== undefined,
    );
  }
}
