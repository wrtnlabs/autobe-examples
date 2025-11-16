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
 * Test creating a new content violation report targeting a specific post.
 *
 * This test validates the complete workflow of a community member reporting a
 * post that violates community rules. It ensures that:
 *
 * - Report creation succeeds with required fields
 * - Priority is automatically assigned based on category severity
 * - Status is initialized to 'submitted'
 * - Reporter identity is captured from authentication context
 * - Optional fields are properly handled
 * - System-managed fields (timestamps) are properly initialized
 *
 * Steps:
 *
 * 1. Create administrator account and authenticate
 * 2. Create a category for community classification
 * 3. Create a community using the category
 * 4. Create a member account who will post content
 * 5. Create a post in the community
 * 6. Create another member account who will report the post
 * 7. Submit a violation report for the post with various violation categories
 * 8. Validate report creation and field initialization
 * 9. Test optional fields (additional_details and reporter_contact_email)
 */
export async function test_api_report_post_violation_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create administrator and category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);
  TestValidator.predicate(
    "administrator should be created with active status",
    administrator.account_status === "active",
  );

  // Step 2: Create a category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          description: "Tech discussions and news",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  TestValidator.equals("category slug matches", category.slug, "technology");

  // Step 3: Create a member account (poster)
  const posterEmail = typia.random<string & tags.Format<"email">>();
  const poster = await api.functional.auth.member.join(connection, {
    body: {
      email: posterEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: "PosterPassword123!",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(poster);

  // Step 4: Create a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: `tech_${RandomGenerator.alphaNumeric(8)}`,
          description: "Community for tech discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community creator is the authenticated member",
    community.creator.email,
    posterEmail,
  );

  // Step 5: Create a post in the community
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Controversial Post Title",
        content_text: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  TestValidator.equals(
    "post visibility should be public",
    post.visibility_status,
    "public",
  );

  // Step 6: Create another member account (reporter)
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporter = await api.functional.auth.member.join(connection, {
    body: {
      email: reporterEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: "ReporterPassword123!",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(reporter);

  // Step 7: Test report creation with different violation categories
  const violationCategories = [
    "illegal_content",
    "hate_speech",
    "harassment",
    "misinformation",
    "spam",
  ] as const;

  for (const category of violationCategories) {
    const reportData = {
      reported_post_id: post.id,
      category,
      additional_details: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 3,
        wordMax: 8,
      }),
      reporter_contact_email: typia.random<string & tags.Format<"email">>(),
    } satisfies ICommunityPlatformReport.ICreate;

    const report = await api.functional.communityPlatform.member.reports.create(
      connection,
      {
        body: reportData,
      },
    );
    typia.assert(report);

    // Validate required fields
    TestValidator.equals(
      `report category should be ${category}`,
      report.category,
      category,
    );
    TestValidator.equals(
      "report status should be submitted",
      report.status,
      "submitted",
    );
    TestValidator.predicate(
      "report should have a valid id",
      report.id !== null && report.id !== undefined,
    );

    // Validate priority assignment based on category
    if (category === "illegal_content") {
      TestValidator.equals(
        "priority should be critical for illegal content",
        report.priority,
        "critical",
      );
    } else if (category === "hate_speech") {
      TestValidator.equals(
        "priority should be high for hate speech",
        report.priority,
        "high",
      );
    } else if (category === "harassment" || category === "misinformation") {
      TestValidator.equals(
        `priority should be medium for ${category}`,
        report.priority,
        "medium",
      );
    } else if (category === "spam") {
      TestValidator.equals(
        "priority should be low for spam",
        report.priority,
        "low",
      );
    }

    // Validate reporter identity
    TestValidator.equals(
      "reporter email should match authenticated member",
      report.reporter.email,
      reporterEmail,
    );
    TestValidator.equals(
      "reported post should match",
      report.reported_post?.id,
      post.id,
    );

    // Validate optional fields
    TestValidator.predicate(
      "additional details should be present and within limits",
      report.additional_details !== null &&
        report.additional_details !== undefined &&
        report.additional_details.length <= 500,
    );
    TestValidator.predicate(
      "reporter contact email should be present",
      report.reporter_contact_email !== null &&
        report.reporter_contact_email !== undefined,
    );

    // Validate timestamps
    TestValidator.predicate(
      "created_at timestamp should be valid ISO date",
      report.created_at !== null && report.created_at !== undefined,
    );
    TestValidator.predicate(
      "updated_at timestamp should be valid ISO date",
      report.updated_at !== null && report.updated_at !== undefined,
    );
  }

  // Step 8: Test report with minimal fields (only required fields)
  const minimalReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: "off_topic",
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(minimalReport);

  TestValidator.equals(
    "minimal report should have off_topic category",
    minimalReport.category,
    "off_topic",
  );
  TestValidator.equals(
    "minimal report status should be submitted",
    minimalReport.status,
    "submitted",
  );
  TestValidator.equals(
    "minimal report priority should be low for off_topic",
    minimalReport.priority,
    "low",
  );
  TestValidator.predicate(
    "reporter should be set from authenticated context",
    minimalReport.reporter.email === reporterEmail,
  );
}
