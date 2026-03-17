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
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_post_vote_my_downvote_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first member (voter)
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {});
  typia.assert(voter);
  // Step 2: Create a community using the first member
  const community = await generate_random_reddit_like_member_communities_create(
    voterConnection,
    {},
  );
  typia.assert(community);
  // Step 3: First member subscribes to community
  const voterSubscription =
    await api.functional.redditLike.member.communities.subscriptions.create(
      voterConnection,
      { communityId: community.id },
    );
  typia.assert(voterSubscription);
  // Step 4: Create second member (post author)
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  // Step 5: Second member subscribes to community
  const authorSubscription =
    await api.functional.redditLike.member.communities.subscriptions.create(
      authorConnection,
      { communityId: community.id },
    );
  typia.assert(authorSubscription);
  // Step 6: Second member creates a post
  const post = await generate_random_reddit_like_member_posts_create(
    authorConnection,
    {
      body: {
        community_id: community.id,
        title: "Test post for downvote retrieval",
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // Step 7: First member downvotes the post
  const downvote = await api.functional.redditLike.member.posts.my_vote.update(
    voterConnection,
    {
      postId: post.id,
      body: { vote_type: "downvote" } satisfies IRedditLikeVote.IUpdate,
    },
  );
  typia.assert(downvote);
  // Step 8: First member retrieves their vote and validates it's a downvote
  const retrievedVote =
    await api.functional.redditLike.member.posts.my_vote.myVote(
      voterConnection,
      { postId: post.id },
    );
  typia.assert(retrievedVote);
  // Validate the vote is a downvote
  TestValidator.equals(
    "vote type should be downvote",
    retrievedVote.vote_type,
    "downvote",
  );
  TestValidator.equals(
    "vote member should match voter",
    retrievedVote.member.id,
    voter.id,
  );
}
