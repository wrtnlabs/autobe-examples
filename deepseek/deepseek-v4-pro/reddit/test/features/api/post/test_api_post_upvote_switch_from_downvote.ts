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
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";

/**
 * Test switching a vote on a post from downvote to upvote.
 *
 * Validates the complete vote-switching workflow: a member joins the platform,
 * creates a community, subscribes to it, creates a post, casts a downvote on
 * that post, then switches their vote to an upvote. The test verifies that the
 * returned vote record reflects the updated direction (value=1) while
 * preserving the original vote creation timestamp, and that the updated_at
 * timestamp changes to reflect the vote modification.
 *
 * 1. Member joins and is authenticated via authorize_member_join.
 * 2. Member creates a community and subscribes to it.
 * 3. Member creates a text post in the community.
 * 4. Member downvotes their own post, establishing an initial vote record.
 * 5. Member switches their vote to an upvote on the same post.
 * 6. Validates the returned vote has value=1 with correct target references,
 *    preserved created_at, and modified updated_at.
 */
export async function test_api_post_upvote_switch_from_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and join
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuthorized);
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
  // 4. Create a post in the community
  const post = await generate_random_community_hub_communities_posts_create(
    memberConnection,
    {
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // 5. Downvote the post
  const downvote = await api.functional.communityHub.member.posts.downvote(
    memberConnection,
    { postId: post.id },
  );
  typia.assert(downvote);
  // 6. Upvote the same post (switching from downvote to upvote)
  const upvote = await api.functional.communityHub.member.posts.upvote(
    memberConnection,
    { postId: post.id },
  );
  typia.assert(upvote);
  // 7. Validate vote record
  TestValidator.equals("vote value is 1 (upvote)", upvote.value, 1);
  TestValidator.equals(
    "vote target is the correct post",
    upvote.target_id,
    post.id,
  );
  TestValidator.equals("vote target type is post", upvote.target_type, "post");
  TestValidator.equals(
    "vote creation timestamp is preserved from original vote",
    upvote.created_at,
    downvote.created_at,
  );
  TestValidator.predicate(
    "vote updated_at reflects the modification",
    () => upvote.updated_at !== upvote.created_at,
  );
}
