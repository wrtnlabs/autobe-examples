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
 * Test the primary upvoting workflow where an authenticated member casts an upvote on a post.
 *
 * Validates the complete voting flow including member authentication, post creation, and upvote casting. Ensures that the vote is successfully created with vote_type 'upvote', the post's vote_score increases to +1, and the response includes both the vote record and post details.
 *
 * Special attention is given to verifying that the authenticated member is correctly recorded as the voter and that the vote score calculation reflects the upvote (+1).
 *
 * 1. Authenticate a new member account with email, password, and username.
 * 2. Create a post in a community using the authenticated member connection.
 * 3. Cast an upvote on the created post using the vote endpoint.
 * 4. Validate that the vote_type is 'upvote' and vote_score is +1.
 * 5. Verify the member who voted matches the authenticated member.
 */
export async function test_api_post_vote_upvote_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: undefined,
  });
  typia.assert(member);
  // 2. Create a post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    { body: undefined },
  );
  typia.assert(post);
  // 3. Cast upvote on the post
  const vote = await api.functional.redditClone.posts.votes.vote(
    memberConnection,
    {
      postId: post.id,
      body: {
        vote_type: "upvote",
      } satisfies IRedditClonePostVote.IRequest,
    },
  );
  typia.assert(vote);
  // 4. Validate vote details
  TestValidator.equals("vote type is upvote", vote.vote_type, "upvote");
  TestValidator.equals("vote score increased to +1", vote.post.vote_score, 1);
  TestValidator.equals(
    "voter matches authenticated member",
    vote.member.id,
    member.id,
  );
  TestValidator.equals(
    "post in vote response matches created post",
    vote.post.id,
    post.id,
  );
  TestValidator.predicate("vote is not deleted", vote.deleted_at === null);
}
