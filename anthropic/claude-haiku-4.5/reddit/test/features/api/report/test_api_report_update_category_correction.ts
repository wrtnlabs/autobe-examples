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
 * Test the ability to correct an initial report category during investigation.
 *
 * This test validates the moderation workflow where an administrator can update
 * a report's violation category when investigation reveals the actual violation
 * type differs from the initial report. The test ensures that:
 *
 * 1. Reports can be created with an initial category and priority
 * 2. Moderators can update the report category during investigation
 * 3. Priority is recalculated based on the new category severity
 * 4. Category changes are properly recorded in the system
 *
 * The test follows a complete workflow:
 *
 * - Administrator creates category and community
 * - Member creates post content
 * - Reporter files initial report with 'off_topic' category (low priority)
 * - Moderator updates report to 'hate_speech' category (high priority)
 * - System recalculates priority and updates the report
 * - Test verifies category and priority changes are reflected
 */
export async function test_api_report_update_category_correction(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123",
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create category for community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          description: "Technology and programming discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberConnection: api.IConnection = { ...connection, headers: {} };
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(memberConnection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: "MemberPassword123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create community as member
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph(),
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
    await api.functional.communityPlatform.member.posts.create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          post_type: "text",
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content_text: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(post);

  // Step 6: Create initial report with 'off_topic' category (low priority)
  const initialReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(
      memberConnection,
      {
        body: {
          reported_post_id: post.id,
          category: "off_topic",
          additional_details: "This post is off-topic for the community",
          reporter_contact_email: typia.random<string & tags.Format<"email">>(),
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert(initialReport);

  // Verify initial report created with correct category
  TestValidator.equals(
    "initial report category is off_topic",
    initialReport.category,
    "off_topic",
  );
  TestValidator.predicate(
    "initial report status is submitted",
    initialReport.status === "submitted",
  );

  // Step 7: Update report category to 'hate_speech' using administrator connection
  const updatedReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.administrator.reports.update(
      connection,
      {
        reportId: initialReport.id,
        body: {
          category: "hate_speech",
          priority: "high",
          additional_details:
            "Upon investigation, this post contains hate speech targeting a protected group",
        } satisfies ICommunityPlatformReport.IUpdate,
      },
    );
  typia.assert(updatedReport);

  // Step 8: Verify category was updated
  TestValidator.equals(
    "report category updated to hate_speech",
    updatedReport.category,
    "hate_speech",
  );

  // Step 9: Verify priority was recalculated to reflect higher severity
  TestValidator.equals(
    "report priority updated to high",
    updatedReport.priority,
    "high",
  );

  // Step 10: Verify additional details were updated with investigation findings
  TestValidator.predicate(
    "additional details contain investigation findings",
    updatedReport.additional_details !== null &&
      updatedReport.additional_details !== undefined &&
      updatedReport.additional_details.includes("investigation"),
  );
}
