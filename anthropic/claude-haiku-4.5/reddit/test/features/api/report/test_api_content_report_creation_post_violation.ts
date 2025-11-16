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
 * Test successful submission of a content violation report on a post
 *
 * This comprehensive E2E test validates the complete content reporting
 * workflow:
 *
 * - Admin creates a category for community organization
 * - Member creates a community and posts content
 * - Another member reports the post for harassment violation
 * - Report is created with correct status, priority, and metadata
 * - All response fields are properly populated and timestamps are valid
 *
 * Test Flow:
 *
 * 1. Admin setup: Create administrator account
 * 2. Category setup: Admin creates community category
 * 3. Member 1 setup: Create content creator member
 * 4. Community setup: Member 1 creates community
 * 5. Post creation: Member 1 creates post in community
 * 6. Member 2 setup: Create reporter member
 * 7. Report submission: Member 2 reports post as harassment
 * 8. Validation: Verify report details and auto-assigned priority
 */
export async function test_api_content_report_creation_post_violation(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "Admin12345!",
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/join",
        referrer: "",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create community category as admin
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          description: "Technology and software discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create first member (content creator)
  const creatorEmail: string = typia.random<string & tags.Format<"email">>();
  const creator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: creatorEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: "Creator12345!",
        href: "http://localhost:3000/auth/join",
        referrer: "",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(creator);

  // Step 4: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          identifier: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community category slug matches",
    community.category.slug,
    category.slug,
  );

  // Step 5: Create post in community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_text: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);
  TestValidator.equals(
    "post community matches",
    post.community.id,
    community.id,
  );

  // Step 6: Create second member (reporter)
  const reporterEmail: string = typia.random<string & tags.Format<"email">>();
  const reporter: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: reporterEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: "Reporter12345!",
        href: "http://localhost:3000/auth/join",
        referrer: "",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(reporter);

  // Step 7: Submit report for post violation
  const reporterContactEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: "harassment",
        additional_details:
          "This post contains harassing comments targeting specific individuals",
        reporter_contact_email: reporterContactEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);

  // Step 8: Validate report details
  TestValidator.equals(
    "report status is submitted",
    report.status,
    "submitted",
  );
  TestValidator.equals(
    "report category is harassment",
    report.category,
    "harassment",
  );
  TestValidator.equals(
    "report priority is high for harassment",
    report.priority,
    "high",
  );
  TestValidator.equals(
    "reported post ID matches",
    report.reported_post?.id,
    post.id,
  );
  TestValidator.equals("reporter ID matches", report.reporter.id, reporter.id);
  TestValidator.equals(
    "additional details match",
    report.additional_details,
    "This post contains harassing comments targeting specific individuals",
  );
  TestValidator.equals(
    "reporter contact email matches",
    report.reporter_contact_email,
    reporterContactEmail,
  );

  // Validate report timestamps
  TestValidator.predicate("created_at timestamp is valid ISO 8601 date", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(report.created_at),
  );
  TestValidator.predicate("updated_at timestamp is valid ISO 8601 date", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(report.updated_at),
  );

  // Validate report has required ID
  TestValidator.predicate("report has valid UUID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      report.id,
    ),
  );

  // Validate reported post reference is complete
  if (report.reported_post) {
    TestValidator.predicate(
      "reported post has title",
      () =>
        report.reported_post?.title !== undefined &&
        report.reported_post?.title.length > 0,
    );
    TestValidator.predicate(
      "reported post has creator info",
      () => report.reported_post?.creator !== undefined,
    );
  }
}
