import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test that platform administrators can retrieve moderation action details for
 * platform-wide oversight and auditing.
 *
 * This validates administrator access to moderation action records. Due to API
 * limitations (no login endpoints available), this test creates the necessary
 * data structure and validates that an admin can retrieve moderation action
 * information. The scenario creates an admin account, then uses that admin
 * context to create test data and verify retrieval capabilities.
 *
 * Note: Full multi-role workflow (member creates content, moderator moderates,
 * admin reviews) cannot be tested due to lack of login/role-switching
 * endpoints.
 */
export async function test_api_moderation_action_platform_admin_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for platform-wide oversight
  const adminData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create member account (admin registers a member for testing)
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 3: Member creates a community (now authenticated as member from join)
  const communityData = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 4: Member creates a post in the community
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 5: Submit content report on the post
  const reportData = {
    reported_post_id: post.id,
    community_id: community.id,
    content_type: "post",
    violation_categories: "spam,harassment",
    additional_context: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditLikeContentReport.ICreate;

  const report: IRedditLikeContentReport =
    await api.functional.redditLike.content_reports.create(connection, {
      body: reportData,
    });
  typia.assert(report);

  // Step 6: Create moderator account
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 7: Moderator takes moderation action (now authenticated as moderator)
  const moderationActionData = {
    report_id: report.id,
    affected_post_id: post.id,
    community_id: community.id,
    action_type: "remove",
    content_type: "post",
    removal_type: "community",
    reason_category: "spam",
    reason_text: RandomGenerator.paragraph({ sentences: 2 }),
    internal_notes: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IRedditLikeModerationAction.ICreate;

  const moderationAction: IRedditLikeModerationAction =
    await api.functional.redditLike.moderation.actions.create(connection, {
      body: moderationActionData,
    });
  typia.assert(moderationAction);

  // Step 8: Create new admin account to test retrieval (fresh admin context)
  const retrievalAdminData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IRedditLikeAdmin.ICreate;

  const retrievalAdmin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: retrievalAdminData,
    });
  typia.assert(retrievalAdmin);

  // Step 9: Administrator retrieves the moderation action
  const retrievedAction: IRedditLikeModerationAction =
    await api.functional.redditLike.admin.moderation.actions.at(connection, {
      actionId: moderationAction.id,
    });
  typia.assert(retrievedAction);

  // Validate that administrator successfully retrieved the moderation action
  TestValidator.equals(
    "retrieved action ID matches created action",
    retrievedAction.id,
    moderationAction.id,
  );
  TestValidator.equals(
    "action type is remove",
    retrievedAction.action_type,
    "remove",
  );
  TestValidator.equals(
    "content type is post",
    retrievedAction.content_type,
    "post",
  );
  TestValidator.equals(
    "reason category matches",
    retrievedAction.reason_category,
    moderationAction.reason_category,
  );
}
