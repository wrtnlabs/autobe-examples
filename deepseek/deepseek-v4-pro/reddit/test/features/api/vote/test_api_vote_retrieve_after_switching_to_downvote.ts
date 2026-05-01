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
 * Test vote retrieval after switching direction from upvote to downvote.
 *
 * Validates the complete vote lifecycle: member authentication, community creation, subscription, post creation, initial upvote, vote direction switch to downvote, and final vote retrieval.
 *
 * The core validation ensures that when a member changes their vote direction from upvote (value 1) to downvote (value -1), the vote record reflects the new direction correctly while preserving the immutable created_at timestamp that records the original voting moment. The updated_at timestamp must be strictly later than created_at, confirming the direction change was registered as a modification.
 *
 * 1. Member joins the platform with random credentials.
 * 2. Member creates a new community and becomes its owner.
 * 3. Member subscribes to their own community.
 * 4. Member creates a text post within the community.
 * 5. Member upvotes the post, establishing the initial vote record.
 * 6. Member switches the vote to a downvote, changing direction.
 * 7. Member retrieves the vote by its ID.
 * 8. Validates value is -1, created_at is unchanged from the upvote timestamp, updated_at is after created_at, and id/target references remain identical.
 */
export async function test_api_vote_retrieve_after_switching_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
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
  // 5. Cast an upvote on the post
  const upvote = await api.functional.communityHub.member.posts.upvote(
    memberConnection,
    { postId: post.id },
  );
  typia.assert(upvote);
  // 6. Switch the upvote to a downvote
  const downvote = await api.functional.communityHub.member.posts.downvote(
    memberConnection,
    { postId: post.id },
  );
  typia.assert(downvote);
  // 7. Retrieve the vote by its ID
  const retrieved = await api.functional.communityHub.member.votes.at(
    memberConnection,
    { voteId: downvote.id },
  );
  typia.assert(retrieved);
  // 8. Validate vote properties after direction switch
  TestValidator.equals(
    "value is -1 after switching to downvote",
    retrieved.value,
    -1,
  );
  TestValidator.equals(
    "created_at preserved from original upvote",
    retrieved.created_at,
    upvote.created_at,
  );
  TestValidator.predicate(
    "updated_at is after created_at",
    retrieved.updated_at > retrieved.created_at,
  );
  TestValidator.equals("vote id remains identical", retrieved.id, upvote.id);
  TestValidator.equals(
    "target_type remains unchanged",
    retrieved.target_type,
    upvote.target_type,
  );
  TestValidator.equals(
    "target_id remains unchanged",
    retrieved.target_id,
    upvote.target_id,
  );
}
