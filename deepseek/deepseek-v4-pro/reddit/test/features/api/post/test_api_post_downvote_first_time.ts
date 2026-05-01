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
 * Test a member casting a downvote on a post they have never voted on before.
 *
 * Validates the complete first-time downvote flow: member registration, community creation, subscription, post creation, and finally the downvote action. Ensures that the vote record correctly reflects a value of -1 with matching target_type and target_id, and confirms that the post author's karma decreases by 1 as a result of the downvote.
 *
 * Special attention is given to verifying that created_at and updated_at are equal on the new vote record, confirming this is a fresh vote with no prior voting history on this target.
 *
 * 1. Member joins the platform with random credentials, starting with karma 0.
 * 2. Member creates a new community and subscribes to it.
 * 3. Member creates a text post in the subscribed community, starting with vote_score 0.
 * 4. Member downvotes the post for the first time.
 * 5. Validates vote value is -1, target_type is 'post', and target_id matches the created post.
 * 6. Confirms created_at equals updated_at, indicating a fresh vote with no prior history.
 * 7. Verifies post author's karma decreased by 1 from its initial value.
 */
export async function test_api_post_downvote_first_time(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member via join
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  TestValidator.equals("initial karma is zero", member.karma, 0);
  // 2. Create community
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
  // 4. Create text post
  const post = await generate_random_community_hub_communities_posts_create(
    memberConnection,
    {
      params: { communityName: community.name },
      body: { type: "text" },
    },
  );
  typia.assert(post);
  TestValidator.equals("initial post vote_score is zero", post.vote_score, 0);
  // 5. Downvote the post for the first time
  const vote = await api.functional.communityHub.member.posts.downvote(
    memberConnection,
    { postId: post.id },
  );
  typia.assert(vote);
  // 6. Validate vote response
  TestValidator.equals("vote value is -1", vote.value, -1);
  TestValidator.equals("vote target_type is 'post'", vote.target_type, "post");
  TestValidator.equals("vote target_id matches post", vote.target_id, post.id);
  TestValidator.equals(
    "created_at equals updated_at for fresh vote",
    vote.created_at,
    vote.updated_at,
  );
  // 7. Verify post author's karma decreased by 1
  TestValidator.equals(
    "post author karma decreased by 1",
    vote.member.karma,
    -1,
  );
}
