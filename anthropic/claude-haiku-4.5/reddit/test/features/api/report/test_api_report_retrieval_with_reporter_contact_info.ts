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
 * Test retrieval of a report that includes optional reporter contact email
 * information.
 *
 * This test validates that when a reporter optionally provides their email
 * address during report creation, an administrator can retrieve the complete
 * report details including the reporter's contact email, additional_details,
 * and all other report metadata without requiring a separate lookup of the
 * reporter's profile.
 *
 * Process:
 *
 * 1. Administrator creates account and authenticates
 * 2. Category is created for community organization
 * 3. Reporter (member) account is created and authenticated
 * 4. Community is created to provide organization context
 * 5. Post is created as the content to be reported
 * 6. Report is created with reporter_contact_email provided by reporter for
 *    notifications
 * 7. Administrator retrieves the report using the report ID
 * 8. Administrator validates all fields including reporter_contact_email,
 *    additional_details, and that reporter information is properly included
 * 9. Test confirms reporter accountability through contact information
 *    preservation
 */
export async function test_api_report_retrieval_with_reporter_contact_info(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate administrator account for report retrieval
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin@12345";
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.predicate("administrator account created", admin.id !== null);

  // Step 2: Create category for community organization
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          slug: RandomGenerator.alphabets(10),
          display_order: 1,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  TestValidator.predicate("category created", category.id !== null);

  // Step 3: Create and authenticate reporter (member) account
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporterPassword = "Reporter@12345";
  const reporter: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: reporterEmail,
        username: RandomGenerator.alphabets(8),
        password: reporterPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(reporter);
  TestValidator.predicate(
    "reporter member account created",
    reporter.id !== null,
  );

  // Step 4: Create community for post organization
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          identifier: RandomGenerator.alphabets(10),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.predicate("community created", community.id !== null);

  // Step 5: Create post to be reported
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);
  TestValidator.predicate("post created for reporting", post.id !== null);

  // Step 6: Create report with reporter contact email for notifications
  const reporterContactEmail = typia.random<string & tags.Format<"email">>();
  const reportAdditionalDetails = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: "harassment",
        additional_details: reportAdditionalDetails,
        reporter_contact_email: reporterContactEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);
  TestValidator.predicate(
    "report created with contact email",
    report.id !== null,
  );
  TestValidator.equals(
    "reporter contact email stored in created report",
    report.reporter_contact_email,
    reporterContactEmail,
  );

  // Step 7: Switch to administrator account for report retrieval
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Step 8: Administrator retrieves report with all details
  const retrievedReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.administrator.reports.at(
      connection,
      {
        reportId: report.id,
      },
    );
  typia.assert(retrievedReport);

  // Step 9: Validate all report fields including contact information
  TestValidator.equals(
    "report ID matches retrieved report",
    retrievedReport.id,
    report.id,
  );
  TestValidator.equals(
    "report category preserved",
    retrievedReport.category,
    "harassment",
  );
  TestValidator.equals(
    "report status is submitted",
    retrievedReport.status,
    "submitted",
  );
  TestValidator.predicate(
    "report priority assigned",
    retrievedReport.priority !== null,
  );

  // Step 10: Validate reporter contact email is available without profile lookup
  TestValidator.equals(
    "reporter contact email available in retrieved report",
    retrievedReport.reporter_contact_email,
    reporterContactEmail,
  );
  TestValidator.predicate(
    "reporter contact email is valid email format",
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(
      retrievedReport.reporter_contact_email ?? "",
    ),
  );

  // Step 11: Validate additional details are preserved
  TestValidator.equals(
    "additional details preserved in retrieved report",
    retrievedReport.additional_details,
    reportAdditionalDetails,
  );

  // Step 12: Validate reporter information is included for accountability
  TestValidator.predicate(
    "reporter information included in report",
    retrievedReport.reporter !== null,
  );
  TestValidator.equals(
    "reporter ID matches session reporter",
    retrievedReport.reporter.id,
    reporter.id,
  );
  TestValidator.predicate(
    "reporter email accessible for follow-up",
    retrievedReport.reporter.email !== null,
  );

  // Step 13: Validate reported post context is included
  TestValidator.predicate(
    "reported post included in report",
    retrievedReport.reported_post !== null,
  );
  TestValidator.equals(
    "reported post ID matches",
    retrievedReport.reported_post?.id,
    post.id,
  );

  // Step 14: Confirm report enables follow-up communication capability
  TestValidator.predicate(
    "contact email enables notification workflow",
    retrievedReport.reporter_contact_email !== null &&
      retrievedReport.reporter_contact_email !== undefined,
  );
  TestValidator.predicate(
    "reporter accountability tracked through contact info",
    retrievedReport.reporter.email !== null &&
      retrievedReport.reporter_contact_email !== null,
  );
}
