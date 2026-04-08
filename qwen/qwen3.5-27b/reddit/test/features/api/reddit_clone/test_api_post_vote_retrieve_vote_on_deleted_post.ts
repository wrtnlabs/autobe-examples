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
import { generate_random_reddit_clone_member_posts_votes_create } from "../../../generate/generate_random_reddit_clone_member_posts_votes_create";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_vote } from "../../../prepare/prepare_random_reddit_clone_post_vote";

/**
 * Test retrieving a vote record on a post to validate vote persistence and structure.
 *
 * Validates the system's behavior when retrieving a vote record by its unique identifier. Tests whether the API correctly returns the vote information including the vote type, associated post details, and member information. This test establishes the baseline behavior for vote retrieval which can be extended to test edge cases like deleted posts when the delete endpoint becomes available.
 *
 * The test verifies that:
 * - Vote records can be retrieved by their unique ID
 * - The vote contains the correct post reference
 * - The vote type (upvote/downvote) is preserved
 * - The vote includes member information
 * - All vote metadata (timestamps) are properly populated
 *
 * 1. Register and authenticate as a member
 * 2. Create a post in a community
 * 3. Cast a vote on the post to create the vote record
 * 4. Retrieve the vote using the vote ID and post ID
 * 5. Verify the response contains all expected vote information
 */
export async function test_api_post_vote_retrieve_vote_on_deleted_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: undefined,
  });
  typia.assert(member);
  // 2. Create a post in a community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    { body: undefined },
  );
  typia.assert(post);
  // 3. Cast a vote on the post to create the vote record
  const vote = await generate_random_reddit_clone_member_posts_votes_create(
    memberConnection,
    {
      params: { postId: post.id },
      body: undefined,
    },
  );
  typia.assert(vote);
  // 4. Retrieve the vote using the vote ID and post ID
  const retrievedVote = await api.functional.redditClone.posts.votes.at(
    memberConnection,
    {
      postId: post.id,
      voteId: vote.id,
    },
  );
  typia.assert(retrievedVote);
  // 5. Verify the response contains all expected vote information
  TestValidator.equals("vote ID matches", retrievedVote.id, vote.id);
  TestValidator.equals("post ID matches", retrievedVote.post.id, post.id);
  TestValidator.equals(
    "vote type preserved",
    retrievedVote.vote_type,
    vote.vote_type,
  );
  TestValidator.equals("member ID matches", retrievedVote.member.id, member.id);
  TestValidator.predicate(
    "vote is not deleted",
    retrievedVote.deleted_at === null,
  );
  TestValidator.predicate(
    "created_at is valid",
    retrievedVote.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid",
    retrievedVote.updated_at !== undefined,
  );
}
