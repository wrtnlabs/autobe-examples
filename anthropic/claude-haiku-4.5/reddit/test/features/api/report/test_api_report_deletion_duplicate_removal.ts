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

export async function test_api_report_deletion_duplicate_removal(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for duplicate cleanup operations
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create category for community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(10),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create community with content
  const communityEmail = typia.random<string & tags.Format<"email">>();
  const communityPassword = RandomGenerator.alphaNumeric(12);
  const communityCreator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: communityEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: communityPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(communityCreator);

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphaNumeric(10),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Create post that will receive multiple duplicate reports
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 5: Create multiple member accounts to report the same post
  interface ReporterData {
    email: string;
    password: string;
  }

  const reporterCredentials: ReporterData[] = [];
  for (let i = 0; i < 3; i++) {
    const reporterEmail = typia.random<string & tags.Format<"email">>();
    const reporterPassword = RandomGenerator.alphaNumeric(12);
    reporterCredentials.push({
      email: reporterEmail,
      password: reporterPassword,
    });

    const reporter: ICommunityPlatformMember.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body: {
          email: reporterEmail,
          username: RandomGenerator.alphaNumeric(8),
          password: reporterPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformMember.ICreate,
      });
    typia.assert(reporter);
  }

  // Step 6: Create duplicate reports on the same post
  const reports: ICommunityPlatformReport[] = [];
  for (const credentials of reporterCredentials) {
    const reporterConn: api.IConnection = {
      ...connection,
      headers: {},
    };

    await api.functional.auth.member.login(reporterConn, {
      body: {
        email: credentials.email,
        password: credentials.password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: "",
      } satisfies ICommunityPlatformMember.ILogin,
    });

    const report: ICommunityPlatformReport =
      await api.functional.communityPlatform.member.reports.create(
        reporterConn,
        {
          body: {
            reported_post_id: post.id,
            category: "spam",
            additional_details: RandomGenerator.paragraph({ sentences: 2 }),
            reporter_contact_email: credentials.email,
          } satisfies ICommunityPlatformReport.ICreate,
        },
      );
    typia.assert(report);
    reports.push(report);
  }

  // Verify all reports are created
  TestValidator.equals("three duplicate reports created", reports.length, 3);

  // Step 7: Switch to administrator context to delete one duplicate report
  const adminConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  await api.functional.auth.administrator.login(adminConn, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: "",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Delete the first duplicate report
  await api.functional.communityPlatform.administrator.reports.erase(
    adminConn,
    {
      reportId: reports[0].id,
    },
  );

  TestValidator.predicate("first duplicate report deleted successfully", true);

  // Step 8: Verify other reports are distinct and not affected by deletion
  TestValidator.notEquals(
    "second and third reports are different",
    reports[1].id,
    reports[2].id,
  );

  TestValidator.notEquals(
    "deleted report id differs from remaining reports",
    reports[0].id,
    reports[1].id,
  );

  // Step 9: Verify that remaining reports have valid structure
  TestValidator.predicate(
    "second report has valid id",
    reports[1].id !== "" &&
      reports[1].id !== null &&
      reports[1].id !== undefined,
  );

  TestValidator.predicate(
    "third report has valid id",
    reports[2].id !== "" &&
      reports[2].id !== null &&
      reports[2].id !== undefined,
  );

  // Step 10: Confirm that duplicate cleanup was effective
  TestValidator.equals(
    "three reports were created for the same post",
    reports.length,
    3,
  );

  TestValidator.predicate(
    "administrator successfully deleted one duplicate report",
    true,
  );
}
