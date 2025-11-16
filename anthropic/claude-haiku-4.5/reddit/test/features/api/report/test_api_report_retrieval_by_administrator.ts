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
 * Test successful retrieval of a moderation report by ID with complete context.
 *
 * This test validates the administrator's ability to retrieve detailed
 * information about a previously created moderation report. The test scenario
 * involves:
 *
 * 1. Creating administrator account through join endpoint
 * 2. Creating a category for community classification
 * 3. Creating a member account for posting
 * 4. Creating a community in the category
 * 5. Creating a post in the community
 * 6. Creating a member account for reporting
 * 7. Creating a moderation report targeting the post
 * 8. Retrieving the report by ID as administrator
 * 9. Validating complete report structure with nested summaries
 *
 * Validates that the response includes:
 *
 * - Complete report object with all fields
 * - Nested reporter summary (member information)
 * - Nested reported post summary (content information)
 * - Violation category, status, and priority
 * - Metadata fields and engagement metrics
 * - Investigation status tracking
 */
export async function test_api_report_retrieval_by_administrator(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = `Pass${RandomGenerator.alphaNumeric(12)}`;
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create a category for community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: `category_${RandomGenerator.alphaNumeric(8)}`,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member account for posting
  const posterEmail = typia.random<string & tags.Format<"email">>();
  const posterPassword = `Pass${RandomGenerator.alphaNumeric(12)}`;
  const poster: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: posterEmail,
        username: `member_${RandomGenerator.alphaNumeric(8)}`,
        password: posterPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(poster);

  // 4. Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: `comm_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create a post in the community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 6. Create another member account for reporting
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporterPassword = `Pass${RandomGenerator.alphaNumeric(12)}`;
  const reporter: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: reporterEmail,
        username: `reporter_${RandomGenerator.alphaNumeric(8)}`,
        password: reporterPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(reporter);

  // 7. Create a moderation report targeting the post
  const violations = [
    "spam",
    "harassment",
    "hate_speech",
    "misinformation",
    "copyright",
    "adult_content",
    "off_topic",
    "self_harm",
    "illegal_content",
    "other",
  ] as const;
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: RandomGenerator.pick(violations),
        additional_details: RandomGenerator.paragraph({ sentences: 2 }),
        reporter_contact_email: reporterEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);

  // 8. Login as administrator and retrieve the report
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: "",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // 9. Retrieve the report by ID as administrator
  const retrievedReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.administrator.reports.at(
      connection,
      {
        reportId: report.id,
      },
    );
  typia.assert(retrievedReport);

  // 10. Validate complete report structure
  TestValidator.equals("report id matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "report category matches",
    retrievedReport.category,
    report.category,
  );
  TestValidator.predicate(
    "report status exists",
    retrievedReport.status !== undefined && retrievedReport.status !== null,
  );
  TestValidator.predicate(
    "report priority exists",
    retrievedReport.priority !== undefined && retrievedReport.priority !== null,
  );

  // 11. Validate reporter information is included
  TestValidator.predicate(
    "reporter summary is populated",
    retrievedReport.reporter !== null && retrievedReport.reporter !== undefined,
  );
  if (retrievedReport.reporter) {
    TestValidator.equals(
      "reporter id matches",
      retrievedReport.reporter.id,
      reporter.id,
    );
    TestValidator.equals(
      "reporter email matches",
      retrievedReport.reporter.email,
      reporterEmail,
    );
  }

  // 12. Validate reported post information is included
  TestValidator.predicate(
    "reported post summary is populated",
    retrievedReport.reported_post !== null &&
      retrievedReport.reported_post !== undefined,
  );
  if (retrievedReport.reported_post) {
    TestValidator.equals(
      "reported post id matches",
      retrievedReport.reported_post.id,
      post.id,
    );
    TestValidator.equals(
      "reported post title matches",
      retrievedReport.reported_post.title,
      post.title,
    );
  }

  // 13. Validate timestamp fields exist
  TestValidator.predicate(
    "created_at timestamp exists",
    retrievedReport.created_at !== undefined &&
      retrievedReport.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    retrievedReport.updated_at !== undefined &&
      retrievedReport.updated_at !== null,
  );

  // 14. Validate engagement metrics exist
  TestValidator.predicate(
    "decisions_count is a number or undefined",
    typeof retrievedReport.decisions_count === "number" ||
      retrievedReport.decisions_count === undefined,
  );
  TestValidator.predicate(
    "warnings_issued_count is a number or undefined",
    typeof retrievedReport.warnings_issued_count === "number" ||
      retrievedReport.warnings_issued_count === undefined,
  );
  TestValidator.predicate(
    "suspensions_count is a number or undefined",
    typeof retrievedReport.suspensions_count === "number" ||
      retrievedReport.suspensions_count === undefined,
  );
  TestValidator.predicate(
    "bans_count is a number or undefined",
    typeof retrievedReport.bans_count === "number" ||
      retrievedReport.bans_count === undefined,
  );
}
