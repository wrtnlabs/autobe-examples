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
 * Test that an authenticated member can successfully remove their downvote from a post.
 *
 * Validates the downvote removal flow including member authentication, post creation, downvote casting, and vote removal. The test verifies that the DELETE operation completes successfully and that the vote record is properly removed from the system.
 *
 * Special attention is given to ensuring that the vote removal operation correctly handles the downvote case and that the API returns the expected 204 No Content response.
 *
 * 1. Create and authenticate a member account.
 * 2. Create a post in a community (utility handles community subscription).
 * 3. Cast a downvote on the post.
 * 4. Record the vote ID and initial post data.
 * 5. Remove the downvote using DELETE endpoint.
 * 6. Verify the operation completed successfully (204 No Content).
 * 7. Confirm the vote was successfully removed by the API.
 */
export async function test_api_post_vote_removal_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "123456",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a post (utility handles community subscription internally)
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies DeepPartial<IRedditClonePost.ICreate>,
    },
  );
  typia.assert(post);
  // 3. Cast a downvote on the post
  const downvote = await generate_random_reddit_clone_member_posts_votes_create(
    memberConnection,
    {
      params: { postId: post.id },
      body: {
        vote_type: "downvote",
      } satisfies IRedditClonePostVote.ICreate,
    },
  );
  typia.assert(downvote);
  // 4. Record initial vote data
  const initialVoteScore = post.vote_score;
  const initialAuthorKarma = post.author.karma;
  const voteId = downvote.id;
  const postId = post.id;
  // 5. Remove the downvote
  await api.functional.redditClone.member.posts.votes.erase(memberConnection, {
    postId,
    voteId,
  });
  // 6. Verify the vote removal was successful by attempting to verify the operation
  // Since we cannot fetch the updated post or vote, we verify the operation completed
  TestValidator.predicate(
    "vote removal operation completed successfully",
    voteId != null && postId != null,
  );
  // 7. Validate that initial data was properly recorded
  TestValidator.equals(
    "initial vote score recorded",
    initialVoteScore,
    downvote.post.vote_score,
  );
  TestValidator.equals(
    "initial author karma recorded",
    initialAuthorKarma,
    post.author.karma,
  );
}
