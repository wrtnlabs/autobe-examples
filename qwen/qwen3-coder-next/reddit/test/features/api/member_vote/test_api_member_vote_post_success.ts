import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";
import type { IRedditLikeSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_posts_votes_create_vote } from "../../../generate/generate_random_reddit_like_member_posts_votes_create_vote";
import { prepare_random_reddit_like_post_vote } from "../../../prepare/prepare_random_reddit_like_post_vote";

export async function test_api_member_vote_post_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member (voter)
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: "1234",
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(voter);
  // 2. Create second member (post author)
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: "1234",
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(author);
  // 3. Create community for posting
  const communityName = `community_${RandomGenerator.alphaNumeric(6)}`;
  const voterSubscribe =
    await api.functional.redditLike.member.communities.subscribe.create(
      voterConnection,
      {
        communityName: communityName,
      },
    );
  typia.assert(voterSubscribe);
  // 4. Author subscribes to the same community
  const authorSubscribe =
    await api.functional.redditLike.member.communities.subscribe.create(
      authorConnection,
      {
        communityName: communityName,
      },
    );
  typia.assert(authorSubscribe);
  // 5. Test upvote functionality
  const postId = typia.random<string & tags.Format<"uuid">>();
  const upvote = await api.functional.redditLike.member.posts.votes.createVote(
    voterConnection,
    {
      postId: postId,
      body: { value: 1 } satisfies IRedditLikePostVote.ICreate,
    },
  );
  typia.assert(upvote);
  TestValidator.equals("upvote value", upvote.value, 1);
  TestValidator.equals("upvote voter", upvote.voter.id, voter.id);
  TestValidator.equals("upvote post", upvote.post.id, postId);
  // 6. Test vote change to downvote
  const downvote =
    await api.functional.redditLike.member.posts.votes.createVote(
      voterConnection,
      {
        postId: postId,
        body: { value: -1 } satisfies IRedditLikePostVote.ICreate,
      },
    );
  typia.assert(downvote);
  TestValidator.equals("downvote value", downvote.value, -1);
  // 7. Test vote removal (value=0)
  const removeVote =
    await api.functional.redditLike.member.posts.votes.createVote(
      voterConnection,
      {
        postId: postId,
        body: { value: 0 } satisfies IRedditLikePostVote.ICreate,
      },
    );
  typia.assert(removeVote);
  TestValidator.equals("remove vote value", removeVote.value, 0);
}
