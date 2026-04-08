import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_member_subscriptions_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test vote uniqueness enforcement where a member changes their existing vote from upvote to downvote.
 *
 * Validates the complete vote change workflow including member authentication, community setup, post creation, initial upvote casting, and vote direction change to downvote. Ensures that the vote record is updated (not recreated) when a member changes their vote on the same post.
 *
 * The test verifies that changing a vote maintains the same vote id, updates the value from +1 to -1, and properly updates the updated_at timestamp. The post's vote score should decrease by 2 (from +1 to -1) reflecting the vote direction change per vote uniqueness rules.
 *
 * 1. Member registers with email, password, and username.
 * 2. Member creates a community to post in.
 * 3. Member subscribes to the created community.
 * 4. Member creates a text post in the community.
 * 5. Member casts initial upvote (+1) on the post.
 * 6. Member changes vote to downvote (-1) on the same post.
 * 7. Validates vote id remains the same (update operation).
 * 8. Validates vote value changed from +1 to -1.
 * 9. Validates updated_at is later than created_at.
 * 10. Validates post vote score decreased by 2.
 */
export async function test_api_post_vote_direction_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await generate_random_reddit_community_member_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create post
  const post = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Cast initial upvote (+1)
  const upvote =
    await api.functional.redditCommunity.member.posts.votes.patchByPostid(
      memberConnection,
      {
        postId: post.id,
        body: {
          value: 1,
        } satisfies IRedditCommunityPostVote.IUpdate,
      },
    );
  typia.assert(upvote);
  TestValidator.equals("initial vote value", upvote.value, 1);
  // 6. Change vote to downvote (-1)
  const downvote =
    await api.functional.redditCommunity.member.posts.votes.patchByPostid(
      memberConnection,
      {
        postId: post.id,
        body: {
          value: -1,
        } satisfies IRedditCommunityPostVote.IUpdate,
      },
    );
  typia.assert(downvote);
  // 7. Validate vote id remains the same (update, not create)
  TestValidator.equals("vote id unchanged", downvote.id, upvote.id);
  // 8. Validate vote value changed from +1 to -1
  TestValidator.equals("vote value changed", downvote.value, -1);
  // 9. Validate updated_at is later than created_at
  TestValidator.predicate(
    "updated_at after created_at",
    new Date(downvote.updated_at).getTime() >
      new Date(downvote.created_at).getTime(),
  );
  // 10. Fetch post again to validate vote score changed
  // Note: We need to get the post again to see updated vote score
  // Since we don't have a get post endpoint in the provided functions,
  // we validate based on the vote response which includes post summary
  TestValidator.equals(
    "post vote score in vote response",
    downvote.post.vote_score,
    -1,
  );
}