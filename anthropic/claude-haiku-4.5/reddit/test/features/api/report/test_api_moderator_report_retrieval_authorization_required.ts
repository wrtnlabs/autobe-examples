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

export async function test_api_moderator_report_retrieval_authorization_required(
  connection: api.IConnection,
) {
  // Step 1: Create administrator and login to create category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(10) + "Aa1!",
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/auth/admin/register",
        referrer: "http://localhost:3000/",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Create a category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech-${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member user
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphabets(10) + "Aa1!",
      href: "http://localhost:3000/auth/member/register",
      referrer: "http://localhost:3000/",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create community as member
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          identifier: `comm-${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create a post in the community
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 6: Create a report on the post
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        reported_post_id: post.id,
        category: "spam",
        additional_details: "This appears to be spam content",
        reporter_contact_email: memberEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);

  // Step 7: Test unauthenticated access - should return 401
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated access should be denied with 401",
    async () => {
      await api.functional.communityPlatform.moderator.reports.at(
        unauthConnection,
        {
          reportId: report.id,
        },
      );
    },
  );

  // Step 8: Test non-moderator member access - should return 403
  await TestValidator.error(
    "non-moderator member access should be denied with 403",
    async () => {
      await api.functional.communityPlatform.moderator.reports.at(connection, {
        reportId: report.id,
      });
    },
  );

  // Step 9: Create moderator and login
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphabets(10) + "Aa1!",
      href: "http://localhost:3000/auth/moderator/register",
      referrer: "http://localhost:3000/",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 10: Moderator should be able to retrieve report details
  const retrievedReport =
    await api.functional.communityPlatform.moderator.reports.at(connection, {
      reportId: report.id,
    });
  typia.assert(retrievedReport);

  // Validate report contains expected context and complete information
  TestValidator.equals(
    "retrieved report ID should match created report",
    retrievedReport.id,
    report.id,
  );
  TestValidator.equals(
    "retrieved report category should match",
    retrievedReport.category,
    "spam",
  );
  TestValidator.predicate(
    "report should have initial status",
    retrievedReport.status !== null && retrievedReport.status !== undefined,
  );
  TestValidator.predicate(
    "report should contain reporter information",
    retrievedReport.reporter !== null && retrievedReport.reporter !== undefined,
  );
  TestValidator.predicate(
    "report should contain reported post information",
    retrievedReport.reported_post !== null &&
      retrievedReport.reported_post !== undefined,
  );
  TestValidator.predicate(
    "reported post should have correct ID",
    retrievedReport.reported_post?.id === post.id,
  );
}
