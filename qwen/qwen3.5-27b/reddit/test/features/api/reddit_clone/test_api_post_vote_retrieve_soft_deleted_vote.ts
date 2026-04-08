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
 * Test retrieving a vote record from a post, including validation of soft-delete fields.
 *
 * Validates the vote retrieval endpoint by creating a member account, posting content, casting a vote, and then retrieving the vote record. The test verifies that all vote fields are properly populated including timestamps and related entity summaries.
 *
 * Note: The soft-delete scenario (deleted_at populated) cannot be fully tested as the vote removal endpoint is not available in the provided API functions. This test validates vote retrieval for active votes where deleted_at is null.
 *
 * 1. Register and authenticate a new member account with email, password, and username.
 * 2. Create a post in a community (member must be subscribed to the community).
 * 3. Cast a vote on the post to create the vote record.
 * 4. Retrieve the vote record using GET /redditClone/posts/{postId}/votes/{voteId}.
 * 5. Validate the vote response structure and field values.
 */
export async function test_api_post_vote_retrieve_soft_deleted_vote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a post in a community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {},
  );
  typia.assert(post);
  // 3. Cast a vote on the post (utility generates random vote_type)
  const vote = await generate_random_reddit_clone_member_posts_votes_create(
    memberConnection,
    {
      params: { postId: post.id },
    },
  );
  typia.assert(vote);
  // 4. Retrieve the vote record
  const retrievedVote = await api.functional.redditClone.posts.votes.at(
    memberConnection,
    {
      postId: post.id,
      voteId: vote.id,
    },
  );
  typia.assert(retrievedVote);
  // 5. Validate vote record structure and fields
  TestValidator.equals("vote id matches", retrievedVote.id, vote.id);
  TestValidator.equals(
    "vote type matches",
    retrievedVote.vote_type,
    vote.vote_type,
  );
  TestValidator.equals("post id matches", retrievedVote.post.id, post.id);
  TestValidator.equals("member id matches", retrievedVote.member.id, member.id);
  TestValidator.predicate(
    "created_at exists",
    retrievedVote.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedVote.updated_at !== undefined,
  );
  TestValidator.predicate(
    "deleted_at is null for active vote",
    retrievedVote.deleted_at === null,
  );
  TestValidator.equals(
    "post title matches",
    retrievedVote.post.title,
    post.title,
  );
  TestValidator.equals(
    "member username matches",
    retrievedVote.member.username,
    member.username,
  );
}
