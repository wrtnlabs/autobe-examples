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
 * Test that a member can upvote a post for the first time.
 *
 * Validates the complete upvote flow: a member registers, creates a community,
 * subscribes to it, publishes a text post, and then casts an upvote on that
 * post. The test verifies the vote response structure — confirming the vote
 * value is 1 (upvote), the target type is "post", the target ID matches the
 * created post, and the voting member is correctly identified.
 *
 * Since the SDK endpoints for fetching individual posts and members are not
 * available, post vote_score and author karma increment are implicitly trusted
 * through the successful vote response. Self-voting is permitted by the
 * platform's business rules, so the same member authors and upvotes the post
 * in this test.
 *
 * 1. Register a new member with random credentials.
 * 2. Create a community owned by the new member.
 * 3. Subscribe the member to the community.
 * 4. Create a text post in the subscribed community.
 * 5. Cast an upvote on the post.
 * 6. Validate the vote record: value=1, correct target type and id, correct member.
 */
export async function test_api_post_upvote_new(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a new member
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
      params: { communityName: community.name },
      body: { type: "text" },
    },
  );
  typia.assert(post);
  // 5. Upvote the post
  const vote = await api.functional.communityHub.member.posts.upvote(
    memberConnection,
    { postId: post.id },
  );
  typia.assert(vote);
  // 6. Validate the vote response
  TestValidator.equals("vote value is upvote", vote.value, 1);
  TestValidator.equals("vote targets a post", vote.target_type, "post");
  TestValidator.equals(
    "vote targets the correct post",
    vote.target_id,
    post.id,
  );
  TestValidator.equals(
    "vote member matches authenticated member",
    vote.member.id,
    member.id,
  );
}
