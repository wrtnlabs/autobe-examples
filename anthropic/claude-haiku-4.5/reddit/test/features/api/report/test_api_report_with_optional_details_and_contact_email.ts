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

export async function test_api_report_with_optional_details_and_contact_email(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate first member (reporter)
  const reporterEmail: string = typia.random<string & tags.Format<"email">>();
  const reporter: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: reporterEmail,
        username: RandomGenerator.name(1),
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(reporter);

  // Step 2: Create administrator and category
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.name(1),
        name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Create category for community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Switch back to reporter for community creation
  await api.functional.auth.member.login(connection, {
    body: {
      email: reporterEmail,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 3: Reporter creates community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(3),
          identifier: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Reporter creates post to report
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

  // Step 5: Reporter submits report with optional fields
  const reporterContactEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const additionalDetailsText: string = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 8,
  });

  // Ensure additional_details does not exceed 500 characters
  const truncatedDetails: string =
    additionalDetailsText.length > 500
      ? additionalDetailsText.substring(0, 500)
      : additionalDetailsText;

  const violationCategories = [
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
  const selectedCategory = RandomGenerator.pick(violationCategories);

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: selectedCategory,
        additional_details: truncatedDetails,
        reporter_contact_email: reporterContactEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);

  // Step 6: Validate response includes all optional fields
  TestValidator.equals(
    "report should have additional_details",
    report.additional_details,
    truncatedDetails,
  );

  TestValidator.equals(
    "report should have reporter_contact_email",
    report.reporter_contact_email,
    reporterContactEmail,
  );

  TestValidator.equals(
    "report category should match submitted category",
    report.category,
    selectedCategory,
  );

  // Step 7: Validate field constraints
  TestValidator.predicate(
    "additional_details length should not exceed 500 characters",
    (report.additional_details ?? "").length <= 500,
  );

  TestValidator.predicate(
    "reporter_contact_email should be valid email format",
    /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(
      report.reporter_contact_email ?? "",
    ),
  );

  TestValidator.equals(
    "report should have reporter information",
    report.reporter.email,
    reporterEmail,
  );

  TestValidator.equals(
    "report should reference the reported post",
    report.reported_post?.id,
    post.id,
  );

  TestValidator.equals(
    "report should have submitted status",
    report.status,
    "submitted",
  );

  TestValidator.predicate(
    "report should have timestamps",
    report.created_at !== undefined && report.updated_at !== undefined,
  );
}
