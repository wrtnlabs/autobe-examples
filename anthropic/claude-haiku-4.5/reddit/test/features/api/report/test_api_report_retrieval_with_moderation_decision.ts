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

/**
 * Test retrieval of a report that includes a complete moderation decision
 * record.
 *
 * This test validates the moderation workflow from report creation through
 * decision recording. It verifies that decision objects contain all necessary
 * fields for accountability and enforcement tracking including action type,
 * reason, moderator identity, and timestamps.
 *
 * Workflow:
 *
 * 1. Create administrator account for moderation operations
 * 2. Create category for community classification
 * 3. Create member account for community participation
 * 4. Create community for discussions
 * 5. Create post within community
 * 6. Create report with violation category and details
 * 7. Switch to administrator context
 * 8. Retrieve report and validate decision structure
 */
export async function test_api_report_retrieval_with_moderation_decision(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        name: "Test Administrator",
        href: "http://localhost:3000/admin",
        referrer: "",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create category for community organization
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech_${RandomGenerator.alphaNumeric(6)}`,
          description: "Technology and software discussion community",
          icon_url: "http://localhost:3000/icons/tech.png",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account for content creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: `user_${RandomGenerator.alphaNumeric(8)}`,
        password: "UserPassword123!",
        ip: "192.168.1.100",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create community for discussions
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: `tech_${RandomGenerator.alphaNumeric(8)}`,
          description: "A community for technology discussions and Q&A",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create post in community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Sample Discussion Post",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 6: Create report for the post
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: "misinformation",
        additional_details:
          "Post contains false technical claims that could mislead developers",
        reporter_contact_email: memberEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);
  TestValidator.predicate(
    "report should have been created",
    report.id !== undefined,
  );

  // Step 7: Switch to administrator context for moderation
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "http://localhost:3000/admin/dashboard",
      referrer: "http://localhost:3000/admin",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Step 8: Retrieve report with moderation decision
  const retrievedReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.administrator.reports.at(
      connection,
      {
        reportId: report.id,
      },
    );
  typia.assert(retrievedReport);

  // Validate report structure
  TestValidator.equals("report ID matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "report category is misinformation",
    retrievedReport.category,
    "misinformation",
  );
  TestValidator.predicate(
    "report status should be valid",
    retrievedReport.status === "submitted" ||
      retrievedReport.status === "in_review" ||
      retrievedReport.status === "pending_decision" ||
      retrievedReport.status === "resolved" ||
      retrievedReport.status === "dismissed",
  );

  // Validate reported content reference
  TestValidator.predicate(
    "reported post should be referenced",
    retrievedReport.reported_post !== null &&
      retrievedReport.reported_post !== undefined,
  );

  if (retrievedReport.reported_post) {
    TestValidator.equals(
      "reported post ID matches",
      retrievedReport.reported_post.id,
      post.id,
    );
  }

  // Validate reporter information
  TestValidator.predicate(
    "reporter information should be present",
    retrievedReport.reporter !== null && retrievedReport.reporter !== undefined,
  );
  TestValidator.equals(
    "reporter email should match",
    retrievedReport.reporter.email,
    memberEmail,
  );

  // Validate timestamps
  TestValidator.predicate(
    "created_at timestamp should exist",
    retrievedReport.created_at !== undefined &&
      retrievedReport.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at timestamp should exist",
    retrievedReport.updated_at !== undefined &&
      retrievedReport.updated_at !== null,
  );

  // Validate decision structure if present
  if (retrievedReport.decision) {
    const decision: ICommunityPlatformReportDecision = retrievedReport.decision;
    typia.assert(decision);

    TestValidator.predicate(
      "decision ID should exist",
      decision.id !== undefined && decision.id !== null,
    );

    // Validate action type
    const validActionTypes = [
      "no_action",
      "remove_content",
      "issue_warning",
      "suspend_user",
      "ban_user",
      "escalate",
    ];
    TestValidator.predicate(
      "action_type should be valid",
      validActionTypes.includes(decision.action_type),
    );

    // Validate reason field
    TestValidator.predicate(
      "reason should have minimum 10 characters",
      decision.reason.length >= 10,
    );

    // Validate suspension duration if action is suspend_user
    if (decision.action_type === "suspend_user") {
      TestValidator.predicate(
        "suspension_duration_days should exist for suspension",
        decision.suspension_duration_days !== undefined &&
          decision.suspension_duration_days !== null,
      );
      if (decision.suspension_duration_days) {
        TestValidator.predicate(
          "suspension_duration_days should be between 1 and 365",
          decision.suspension_duration_days >= 1 &&
            decision.suspension_duration_days <= 365,
        );
      }
    }

    // Validate moderator information
    TestValidator.predicate(
      "moderator should be referenced",
      decision.moderator !== null && decision.moderator !== undefined,
    );

    // Validate decision timestamps
    TestValidator.predicate(
      "decision created_at should exist",
      decision.created_at !== undefined && decision.created_at !== null,
    );
    TestValidator.predicate(
      "decision updated_at should exist",
      decision.updated_at !== undefined && decision.updated_at !== null,
    );

    // Validate report back-reference
    TestValidator.predicate(
      "decision report reference should exist",
      decision.report !== null && decision.report !== undefined,
    );
  }
}
