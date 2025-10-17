import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test moderator's ability to retrieve detailed moderation action information.
 *
 * This test validates the complete audit trail visibility for moderators
 * reviewing their moderation history. It creates a realistic moderation
 * workflow where a moderator responds to a content report and then retrieves
 * the action details.
 *
 * Steps:
 *
 * 1. Create a moderator account
 * 2. Create a member account
 * 3. Create a community with the moderator assigned
 * 4. Member creates a post in the community
 * 5. Submit a content report for the post
 * 6. Moderator creates a moderation action in response
 * 7. Moderator retrieves the moderation action details
 * 8. Verify all action metadata is properly returned
 */
export async function test_api_moderation_action_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create member account
  const memberData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(member);

  // Step 3: Create community (moderator is automatically assigned as creator)
  const communityData = {
    code: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<25> &
        tags.Pattern<"^[a-zA-Z0-9_]+$">
    >(),
    name: typia.random<string & tags.MinLength<3> & tags.MaxLength<25>>(),
    description: typia.random<
      string & tags.MinLength<10> & tags.MaxLength<500>
    >(),
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 4: Member creates a post in the community
  const postTypes = ["text", "link", "image"] as const;
  const postType = RandomGenerator.pick(postTypes);

  const postData = {
    community_id: community.id,
    type: postType,
    title: typia.random<string & tags.MinLength<3> & tags.MaxLength<300>>(),
    body:
      postType === "text"
        ? typia.random<string & tags.MaxLength<40000>>()
        : undefined,
    url:
      postType === "link"
        ? typia.random<string & tags.MaxLength<2000>>()
        : undefined,
    image_url:
      postType === "image" ? "https://example.com/image.png" : undefined,
    caption:
      postType === "image"
        ? typia.random<string & tags.MaxLength<10000>>()
        : undefined,
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 5: Submit content report for the post
  const reportData = {
    reported_post_id: post.id,
    community_id: community.id,
    content_type: "post",
    violation_categories: "spam,harassment",
    additional_context: typia.random<string & tags.MaxLength<500>>(),
  } satisfies IRedditLikeContentReport.ICreate;

  const report: IRedditLikeContentReport =
    await api.functional.redditLike.content_reports.create(connection, {
      body: reportData,
    });
  typia.assert(report);

  // Step 6: Moderator creates a moderation action in response to the report
  const actionTypes = [
    "remove",
    "approve",
    "dismiss_report",
    "escalate",
    "restore",
    "lock",
  ] as const;
  const actionType = RandomGenerator.pick(actionTypes);

  const moderationActionData = {
    report_id: report.id,
    affected_post_id: post.id,
    community_id: community.id,
    action_type: actionType,
    content_type: "post",
    removal_type: actionType === "remove" ? "community" : undefined,
    reason_category: "spam",
    reason_text: "This post violates community guidelines",
    internal_notes: "Action taken based on user report",
  } satisfies IRedditLikeModerationAction.ICreate;

  const createdAction: IRedditLikeModerationAction =
    await api.functional.redditLike.moderation.actions.create(connection, {
      body: moderationActionData,
    });
  typia.assert(createdAction);

  // Step 7: Moderator retrieves the moderation action details
  const retrievedAction: IRedditLikeModerationAction =
    await api.functional.redditLike.moderator.moderation.actions.at(
      connection,
      { actionId: createdAction.id },
    );
  typia.assert(retrievedAction);

  // Step 8: Verify all action metadata is properly returned
  TestValidator.equals(
    "action ID matches",
    retrievedAction.id,
    createdAction.id,
  );
  TestValidator.equals(
    "action type matches",
    retrievedAction.action_type,
    actionType,
  );
  TestValidator.equals(
    "content type matches",
    retrievedAction.content_type,
    "post",
  );
  TestValidator.equals(
    "reason category matches",
    retrievedAction.reason_category,
    "spam",
  );
  TestValidator.equals(
    "reason text matches",
    retrievedAction.reason_text,
    "This post violates community guidelines",
  );
  TestValidator.equals(
    "status is completed",
    retrievedAction.status,
    "completed",
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    typeof retrievedAction.created_at === "string",
  );
}
