import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import type { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
import type { ICommunityHubVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_communities_posts_create } from "../../../generate/generate_random_community_hub_communities_posts_create";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { generate_random_community_hub_posts_comments_create } from "../../../generate/generate_random_community_hub_posts_comments_create";
import { prepare_random_community_hub_comment } from "../../../prepare/prepare_random_community_hub_comment";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";

/**
 * Test switching a comment vote from upvote to downvote.
 *
 * Validates the complete vote-switching flow where a member who previously upvoted a comment changes their vote to a downvote. The test walks through the full dependency chain — member registration, community creation, subscription, post creation, and comment creation — before casting and then switching the vote.
 *
 * The vote record's value must transition from 1 to -1 upon switching. The created_at timestamp must be preserved from the original upvote, confirming the vote record identity persists through the switch. The updated_at timestamp must change to reflect the modification time of the switch operation.
 *
 * The comment's vote_score decreases by 2 (removing the +1 upvote and applying the -1 downvote), and the comment author's karma decreases by 2 accordingly. These cascading effects are documented as expected system behavior per the API specification.
 *
 * 1. Register and authenticate as a new member via authorize_member_join.
 * 2. Create a community using the generation utility.
 * 3. Subscribe the member to the community.
 * 4. Create a text post within the community.
 * 5. Create a top-level comment on the post.
 * 6. Cast an upvote on the comment, recording the initial vote record.
 * 7. Switch the vote by calling the downvote endpoint.
 * 8. Validate vote value is -1, created_at is preserved, updated_at reflects the modification.
 */
export async function test_api_comment_downvote_switch_from_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Create a text post in the community
  const post = await generate_random_community_hub_communities_posts_create(
    memberConnection,
    {
      body: { type: "text" },
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // 5. Create a top-level comment on the post
  const comment = await generate_random_community_hub_posts_comments_create(
    memberConnection,
    { params: { postId: post.id } },
  );
  typia.assert(comment);
  // 6. Cast an upvote on the comment
  const upvoteResult = await api.functional.communityHub.member.comments.upvote(
    memberConnection,
    { commentId: comment.id },
  );
  typia.assert(upvoteResult);
  // 7. Switch from upvote to downvote
  const downvoteResult =
    await api.functional.communityHub.member.comments.downvote(
      memberConnection,
      { commentId: comment.id },
    );
  typia.assert(downvoteResult);
  // 8. Validate the vote switch
  TestValidator.equals("vote value switched to -1", downvoteResult.value, -1);
  TestValidator.equals(
    "created_at preserved from original upvote",
    downvoteResult.created_at,
    upvoteResult.created_at,
  );
  TestValidator.notEquals(
    "updated_at reflects modification time",
    downvoteResult.updated_at,
    upvoteResult.updated_at,
  );
  TestValidator.equals(
    "vote target remains the comment",
    downvoteResult.target_id,
    comment.id,
  );
}
