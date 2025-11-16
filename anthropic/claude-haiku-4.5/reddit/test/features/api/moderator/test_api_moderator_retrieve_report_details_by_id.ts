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

export async function test_api_moderator_retrieve_report_details_by_id(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a category for community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphabets(8),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member for community creation and reporting
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create community for post
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          identifier: RandomGenerator.alphabets(8),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create post to be reported
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph(),
        content_text: RandomGenerator.content(),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 6: Create report on the post
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: "spam",
        additional_details: RandomGenerator.paragraph(),
        reporter_contact_email: typia.random<string & tags.Format<"email">>(),
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);

  // Step 7: Create moderator account for report retrieval
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 8: Moderator retrieves report details by ID
  const retrievedReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.moderator.reports.at(connection, {
      reportId: report.id,
    });
  typia.assert(retrievedReport);

  // Step 9: Validate complete report details
  TestValidator.equals("report ID matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "report category correct",
    retrievedReport.category,
    "spam",
  );
  TestValidator.equals(
    "report status is submitted",
    retrievedReport.status,
    "submitted",
  );
  TestValidator.equals(
    "reporter information included",
    retrievedReport.reporter.id,
    member.id,
  );
  TestValidator.equals(
    "reported post included",
    retrievedReport.reported_post?.id,
    post.id,
  );

  // Step 10: Validate reporter contact email if provided
  if (report.reporter_contact_email) {
    TestValidator.equals(
      "reporter contact email matches",
      retrievedReport.reporter_contact_email,
      report.reporter_contact_email,
    );
  }

  // Step 11: Validate optional fields and computed metrics
  TestValidator.predicate(
    "decisions count is non-negative",
    typeof retrievedReport.decisions_count === "undefined" ||
      retrievedReport.decisions_count >= 0,
  );
  TestValidator.predicate(
    "warnings issued count is non-negative",
    typeof retrievedReport.warnings_issued_count === "undefined" ||
      retrievedReport.warnings_issued_count >= 0,
  );
  TestValidator.predicate(
    "suspensions count is non-negative",
    typeof retrievedReport.suspensions_count === "undefined" ||
      retrievedReport.suspensions_count >= 0,
  );
  TestValidator.predicate(
    "bans count is non-negative",
    typeof retrievedReport.bans_count === "undefined" ||
      retrievedReport.bans_count >= 0,
  );

  // Step 12: Validate timestamp formats (ISO 8601 UTC)
  TestValidator.predicate(
    "created_at is ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(
      retrievedReport.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(
      retrievedReport.updated_at,
    ),
  );

  // Step 13: Verify moderator authorization required by testing with unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated access to report should fail",
    async () => {
      await api.functional.communityPlatform.moderator.reports.at(unauthConn, {
        reportId: report.id,
      });
    },
  );
}
