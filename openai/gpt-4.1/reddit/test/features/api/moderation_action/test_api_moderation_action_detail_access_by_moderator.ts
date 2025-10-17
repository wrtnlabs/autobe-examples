import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";

/**
 * Test that a moderator can retrieve full detail of a moderation action and
 * that all fields are set correctly.
 *
 * 1. Create a unique community as a baseline for operations.
 * 2. Create a post (as member) within the community.
 * 3. Create a report category (admin action).
 * 4. File a report as a member against the post.
 * 5. Register/join as a moderator for the community with verified member email.
 * 6. Log in as moderator and perform a moderation action (e.g. 'remove_post') on
 *    the reported post, referencing the report.
 * 7. Retrieve the moderation action by its ID as the moderator via GET endpoint.
 * 8. Validate all expected properties of the moderation action (actor, target
 *    post, linked report, action_type, description, timestamp).
 * 9. Check permission: confirm failure or privacy masking for non-existing ID or
 *    insufficient permissions.
 */
export async function test_api_moderation_action_detail_access_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create a community
  const communityCreate = {
    name: RandomGenerator.alphabets(12).toLowerCase(),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    slug: RandomGenerator.alphaNumeric(10).toLowerCase(),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityCreate },
    );
  typia.assert(community);
  // Step 2: Create a post as member
  const postCreate = {
    community_platform_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content_body: RandomGenerator.content({ paragraphs: 1 }),
    content_type: "text",
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    { body: postCreate },
  );
  typia.assert(post);
  // Step 3: Create a report category (admin privilege in test - simulate or assume admin auth)
  const reportCategoryCreate = {
    name: "test_category_" + RandomGenerator.alphaNumeric(8),
    allow_free_text: true,
  } satisfies ICommunityPlatformReportCategory.ICreate;
  const reportCategory =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      { body: reportCategoryCreate },
    );
  typia.assert(reportCategory);
  // Step 4: File a report (as member)
  const reportCreate = {
    post_id: post.id,
    report_category_id: reportCategory.id,
    reason_text: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformReport.ICreate;
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    { body: reportCreate },
  );
  typia.assert(report);
  // Step 5: Register/join as a new moderator (with actual member email -- assume email matches some membership for test)
  const moderatorEmail = RandomGenerator.alphabets(10) + "@e2e.com";
  const moderatorPassword = "e2ePassword@123!";
  const moderatorJoin = {
    email: moderatorEmail as string & tags.Format<"email">,
    password: moderatorPassword as string & tags.Format<"password">,
    community_id: community.id,
  } satisfies ICommunityPlatformModerator.IJoin;
  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: moderatorJoin,
  });
  typia.assert(moderatorAuth);
  // Step 6: Create a moderation action (linking the new moderator actor, post, and report)
  const moderationActionCreate = {
    actor_id: moderatorAuth.id,
    target_post_id: post.id,
    report_id: report.id,
    action_type: "remove_post",
    description: "Test removal action for E2E.",
  } satisfies ICommunityPlatformModerationAction.ICreate;
  const moderationAction =
    await api.functional.communityPlatform.moderator.moderationActions.create(
      connection,
      { body: moderationActionCreate },
    );
  typia.assert(moderationAction);
  // Step 7: Retrieve the moderation action by its ID as the moderator
  const detail =
    await api.functional.communityPlatform.moderator.moderationActions.at(
      connection,
      { moderationActionId: moderationAction.id },
    );
  typia.assert(detail);
  // Step 8: Validate key audit/tracking fields in the retrieved moderation action
  TestValidator.equals(
    "actor id matches moderator",
    detail.actor_id,
    moderatorAuth.id,
  );
  TestValidator.equals(
    "target post id correct",
    detail.target_post_id,
    post.id,
  );
  TestValidator.equals("report id matches", detail.report_id, report.id);
  TestValidator.equals(
    "action type is remove_post",
    detail.action_type,
    moderationActionCreate.action_type,
  );
  TestValidator.equals(
    "description is preserved",
    detail.description,
    moderationActionCreate.description,
  );
  TestValidator.predicate(
    "action timestamp present",
    typeof detail.created_at === "string" && detail.created_at.length > 0,
  );
  // Step 9: Attempt to fetch with a non-existent ID and expect error
  await TestValidator.error(
    "fetch invalid moderation action id fails",
    async () => {
      await api.functional.communityPlatform.moderator.moderationActions.at(
        connection,
        {
          moderationActionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
