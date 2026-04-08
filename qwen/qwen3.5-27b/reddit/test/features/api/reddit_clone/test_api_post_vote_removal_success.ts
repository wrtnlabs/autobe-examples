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
 * Test that an authenticated member can successfully remove their upvote from a post.
 *
 * Validates the complete vote removal workflow including member authentication, post creation, vote casting, and vote deletion. Ensures that when a member removes their upvote, the operation completes successfully with a 204 No Content response.
 *
 * Special attention is given to verifying that the vote is properly cast before removal, and that the erase operation accepts valid vote ownership and post references.
 *
 * 1. Member authenticates and creates a post in a subscribed community.
 * 2. Member casts an upvote on the post and records the vote ID.
 * 3. Member removes the vote by calling the delete endpoint.
 * 4. Validates that the vote removal operation completes successfully without errors.
 */
export async function test_api_post_vote_removal_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a post (utility function handles community subscription)
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {},
  );
  typia.assert(post);
  // 3. Cast an upvote on the post
  const vote = await generate_random_reddit_clone_member_posts_votes_create(
    memberConnection,
    {
      params: { postId: post.id },
      body: { vote_type: "upvote" },
    },
  );
  typia.assert(vote);
  // 4. Validate vote was created correctly
  TestValidator.equals("vote type is upvote", vote.vote_type, "upvote");
  TestValidator.equals(
    "vote is associated with correct post",
    vote.post.id,
    post.id,
  );
  // 5. Remove the vote
  await api.functional.redditClone.member.posts.votes.erase(memberConnection, {
    postId: post.id,
    voteId: vote.id,
  });
  // 6. Validate vote removal succeeded (operation completed without error)
  TestValidator.predicate("vote removal completed successfully", true);
}
