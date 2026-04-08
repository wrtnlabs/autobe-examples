import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test the vote modification workflow where a member changes their existing vote from upvote to downvote.
 *
 * Validates that vote changes are handled as updates to the existing vote record rather than creating duplicate votes. The test verifies that when a member changes their vote type, the vote_score is correctly recalculated and the vote record's updated_at timestamp is refreshed while created_at remains unchanged.
 *
 * 1. Authenticate a member account for voting capability.
 * 2. Create a post in a community that the member can vote on.
 * 3. Cast an initial upvote on the post (vote_score becomes +1).
 * 4. Change the vote to downvote (vote_score should become -1, a difference of -2).
 * 5. Verify the vote record is updated with the new vote_type.
 * 6. Confirm the updated_at timestamp is refreshed while created_at remains unchanged.
 */
export async function test_api_post_vote_change_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // 2. Create a post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {},
  );
  typia.assert(post);
  // 3. Cast initial upvote
  const upvoteResult = await api.functional.redditClone.posts.votes.vote(
    memberConnection,
    {
      postId: post.id,
      body: {
        vote_type: "upvote",
      } satisfies IRedditClonePostVote.IRequest,
    },
  );
  typia.assert(upvoteResult);
  // Verify upvote was cast
  TestValidator.equals(
    "initial vote type is upvote",
    upvoteResult.vote_type,
    "upvote",
  );
  TestValidator.equals(
    "post vote score after upvote",
    upvoteResult.post.vote_score,
    1,
  );
  // Store created_at timestamp
  const createdAt = upvoteResult.created_at;
  const upvoteUpdatedAt = upvoteResult.updated_at;
  // 4. Change vote to downvote
  const downvoteResult = await api.functional.redditClone.posts.votes.vote(
    memberConnection,
    {
      postId: post.id,
      body: {
        vote_type: "downvote",
      } satisfies IRedditClonePostVote.IRequest,
    },
  );
  typia.assert(downvoteResult);
  // 5. Verify vote record is updated
  TestValidator.equals(
    "vote type changed to downvote",
    downvoteResult.vote_type,
    "downvote",
  );
  TestValidator.equals(
    "post vote score after downvote",
    downvoteResult.post.vote_score,
    -1,
  );
  // 6. Verify timestamps
  TestValidator.equals(
    "created_at remains unchanged",
    downvoteResult.created_at,
    createdAt,
  );
  TestValidator.notEquals(
    "updated_at is refreshed",
    downvoteResult.updated_at,
    upvoteUpdatedAt,
  );
  TestValidator.predicate(
    "updated_at is after upvote",
    new Date(downvoteResult.updated_at).getTime() >
      new Date(upvoteUpdatedAt).getTime(),
  );
}
