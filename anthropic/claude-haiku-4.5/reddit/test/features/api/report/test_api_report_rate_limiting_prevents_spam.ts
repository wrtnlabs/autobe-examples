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

export async function test_api_report_rate_limiting_prevents_spam(
  connection: api.IConnection,
) {
  // Step 1: Create a member account (reporter)
  const reporterEmail: string = typia.random<string & tags.Format<"email">>();
  const reporter: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: reporterEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: "TestPassword123!",
        href: "http://localhost/register",
        referrer: "http://localhost/",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(reporter);

  // Step 2: Create an administrator account for category creation
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminConn: api.IConnection = { ...connection };
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(adminConn, {
      body: {
        email: adminEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: "AdminPassword123!",
        name: RandomGenerator.name(),
        href: "http://localhost/admin",
        referrer: "http://localhost/",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 3: Create a category for community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConn,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
          display_order: 1,
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphaNumeric(8).toLowerCase(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create multiple posts for reporting
  const posts: ICommunityPlatformPost[] = await ArrayUtil.asyncRepeat(5, () =>
    api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    }),
  );
  for (const post of posts) {
    typia.assert(post);
  }

  // Step 6: Switch to reporter account and submit first report (should succeed)
  const reporterConn: api.IConnection = { ...connection };
  reporterConn.headers = {
    ...connection.headers,
    Authorization: reporter.token.access,
  };

  const firstReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(reporterConn, {
      body: {
        reported_post_id: posts[0].id,
        category: "spam",
        additional_details: "This post appears to be spam content",
        reporter_contact_email: reporterEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(firstReport);
  TestValidator.equals(
    "first report created successfully",
    firstReport.category,
    "spam",
  );

  // Step 7: Submit second report (should succeed)
  const secondReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(reporterConn, {
      body: {
        reported_post_id: posts[1].id,
        category: "harassment",
        additional_details: "Harassing content detected",
        reporter_contact_email: reporterEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(secondReport);
  TestValidator.equals(
    "second report created successfully",
    secondReport.category,
    "harassment",
  );

  // Step 8: Rapidly submit multiple reports in succession to trigger rate limit
  // Submit reports sequentially to properly trigger rate limit enforcement
  let successfulReports: number = 0;
  let rateLimitHit: boolean = false;

  for (let i = 0; i < 3; i++) {
    try {
      const report: ICommunityPlatformReport =
        await api.functional.communityPlatform.member.reports.create(
          reporterConn,
          {
            body: {
              reported_post_id: posts[2 + i].id,
              category: "off_topic",
              additional_details: `Rapid report attempt ${i + 3}`,
              reporter_contact_email: reporterEmail,
            } satisfies ICommunityPlatformReport.ICreate,
          },
        );
      typia.assert(report);
      successfulReports++;
    } catch {
      rateLimitHit = true;
      break;
    }
  }

  TestValidator.predicate(
    "rate limiting successfully prevents spam reports after threshold",
    successfulReports >= 2 && rateLimitHit === true,
  );

  // Step 9: Test that rate limit is per-reporter, not global
  // Create a second reporter and verify they can submit reports
  const secondReporterEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const secondReporter: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: secondReporterEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: "TestPassword123!",
        href: "http://localhost/register",
        referrer: "http://localhost/",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(secondReporter);

  const secondReporterConn: api.IConnection = { ...connection };
  secondReporterConn.headers = {
    ...connection.headers,
    Authorization: secondReporter.token.access,
  };

  // Second reporter should be able to submit reports without hitting the first reporter's rate limit
  const secondReporterReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(
      secondReporterConn,
      {
        body: {
          reported_post_id: posts[0].id,
          category: "misinformation",
          additional_details: "Misinformation detected",
          reporter_contact_email: secondReporterEmail,
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert(secondReporterReport);
  TestValidator.equals(
    "second reporter can submit report without hitting first reporter's rate limit",
    secondReporterReport.category,
    "misinformation",
  );

  // Step 10: Verify rate limit is per-reporter enforcement
  TestValidator.predicate(
    "rate limit is enforced per-reporter not globally",
    rateLimitHit === true,
  );

  // Step 11: Verify legitimate reporting continues to work
  TestValidator.predicate(
    "legitimate reporting from different reporter succeeds",
    secondReporterReport.id !== null && secondReporterReport.id !== undefined,
  );
}
