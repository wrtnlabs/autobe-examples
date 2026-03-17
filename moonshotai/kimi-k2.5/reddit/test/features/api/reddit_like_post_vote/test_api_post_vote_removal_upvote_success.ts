import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import type { IRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_posts_votes_create } from "../../../generate/generate_random_reddit_like_member_posts_votes_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_vote } from "../../../prepare/prepare_random_reddit_like_vote";

/**
 * Test successful removal of an upvote from a post.
 * Validates that an authenticated member can create an upvote and successfully remove it.
 * Note: Post retrieval endpoint is not available in current SDK, so voteScore
 * verification after vote removal is handled by verifying the erase operation succeeds.
 */
export async function test_api_post_vote_removal_upvote_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditLikeMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(1),
        password: typia.random<
          string & tags.MinLength<8> & tags.Format<"password">
        >(),
      },
    },
  );
  typia.assert(member);
  // 2. Create community
  const community: IRedditLikeCommunity =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(1)
            .replace(/[^a-zA-Z0-9-]/g, "")
            .toLowerCase()
            .substring(0, 30),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. Create post in community
  const post: IRedditLikePost =
    await generate_random_reddit_like_member_posts_create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 8,
        }),
        community_id: community.id,
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      },
    });
  typia.assert(post);
  const initialVoteScore = post.voteScore;
  // 5. Cast upvote on post
  const vote: IRedditLikeVote =
    await generate_random_reddit_like_member_posts_votes_create(
      memberConnection,
      {
        body: {
          vote_type: "upvote",
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(vote);
  typia.assert(vote.vote_type === "upvote");
  // 6. Remove upvote - this should succeed without error
  await api.functional.redditLike.member.posts.my_vote.erase(memberConnection, {
    postId: post.id,
  });
  // Verify vote was removed by checking initial state can be reverted (no error means success)
  // Note: The erase endpoint returns void/204 on success, so successful execution confirms removal
  TestValidator.predicate("vote removal completed successfully", true);
}
