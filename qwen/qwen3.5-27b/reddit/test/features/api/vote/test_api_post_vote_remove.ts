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
 * Test the vote removal workflow where a member removes their existing vote from a post.
 *
 * Validates the complete vote removal flow including member authentication, post creation, vote casting, and vote removal. Ensures that when a member removes their vote, the vote record is soft-deleted (deleted_at is set) and the post's vote score is correctly recalculated.
 *
 * Special attention is given to verifying that the vote removal properly soft-deletes the vote record while maintaining the audit trail, and that the post's vote score accurately reflects the removal.
 *
 * 1. Member authenticates via join endpoint.
 * 2. Member creates a post in a community.
 * 3. Member casts an upvote on the post.
 * 4. Member removes the vote by calling the endpoint with vote_type omitted.
 * 5. Validates the vote record has deleted_at timestamp set.
 * 6. Validates the post's vote_score returns to 0.
 */
export async function test_api_post_vote_remove(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {},
  );
  typia.assert(post);
  // 3. Cast an upvote on the post
  const upvote = await api.functional.redditClone.posts.votes.vote(
    memberConnection,
    {
      postId: post.id,
      body: {
        vote_type: "upvote",
      } satisfies IRedditClonePostVote.IRequest,
    },
  );
  typia.assert(upvote);
  // Verify the upvote was cast successfully
  TestValidator.equals("upvote type is upvote", upvote.vote_type, "upvote");
  TestValidator.equals("upvote is not deleted", upvote.deleted_at, null);
  TestValidator.predicate(
    "post vote score increased after upvote",
    upvote.post.vote_score > post.vote_score,
  );
  // 4. Remove the vote by omitting vote_type
  const removedVote = await api.functional.redditClone.posts.votes.vote(
    memberConnection,
    {
      postId: post.id,
      body: {} satisfies IRedditClonePostVote.IRequest,
    },
  );
  typia.assert(removedVote);
  // 5. Validate the vote record is soft-deleted
  TestValidator.predicate(
    "vote is soft-deleted (deleted_at is set)",
    removedVote.deleted_at !== null,
  );
  // 6. Validate the vote type is still preserved (audit trail)
  TestValidator.equals(
    "vote type preserved after removal",
    removedVote.vote_type,
    "upvote",
  );
  // 7. Validate the post's vote score returned to original value
  TestValidator.equals(
    "post vote score returned to original",
    removedVote.post.vote_score,
    post.vote_score,
  );
}
