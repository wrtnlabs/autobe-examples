import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test the vote change workflow where a member modifies their existing vote from upvote to downvote.
 *
 * This test validates:
 * 1. Member can cast an initial upvote (value: 1) on a post
 * 2. Member can change their vote to a downvote (value: -1)
 * 3. Post score decreases by 2 points (from +1 to -1)
 * 4. Author's karma decreases by 2 points accordingly
 * 5. Vote record is updated (not duplicated)
 * 6. Response returns updated post with correct score
 */
export async function test_api_post_vote_change_from_upvote_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // 2. Create a community for the post
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "text",
        communityId: community.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Capture initial score and author karma
  const initialScore = post.score;
  const initialAuthorKarma = post.author.karma;
  // 5. Cast an upvote (value: 1)
  const upvotedPost = await api.functional.redditClone.member.posts.vote(
    memberConnection,
    {
      postId: post.id,
      body: { value: 1 } satisfies IRedditClonePost.IVoteRequest,
    },
  );
  typia.assert(upvotedPost);
  // 6. Verify upvote increased score by 1
  TestValidator.equals(
    "score after upvote",
    upvotedPost.score,
    initialScore + 1,
  );
  TestValidator.equals(
    "author karma after upvote",
    upvotedPost.author.karma,
    initialAuthorKarma + 1,
  );
  // 7. Change vote to downvote (value: -1)
  const downvotedPost = await api.functional.redditClone.member.posts.vote(
    memberConnection,
    {
      postId: post.id,
      body: { value: -1 } satisfies IRedditClonePost.IVoteRequest,
    },
  );
  typia.assert(downvotedPost);
  // 8. Verify downvote decreased score by 2 (from +1 to -1)
  TestValidator.equals(
    "score after downvote",
    downvotedPost.score,
    initialScore - 1,
  );
  TestValidator.equals(
    "author karma after downvote",
    downvotedPost.author.karma,
    initialAuthorKarma - 1,
  );
  // 9. Verify the vote was updated (not duplicated) - score should be exactly -1, not -2
  TestValidator.predicate(
    "vote was updated not duplicated",
    downvotedPost.score === -1,
  );
}
