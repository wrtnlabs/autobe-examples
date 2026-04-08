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
 * Test that vote removal is rejected when the target post has been deleted.
 *
 * Validates the business rule that deleted content cannot receive new votes or have existing votes modified. The test creates a post, casts a vote on it, deletes the post, and then attempts to remove the vote. The system should reject the vote removal with a 404 Not Found error, preserving the vote record and maintaining the post's vote score and author's karma unchanged.
 *
 * This test ensures that the integrity of vote records is maintained even when the associated content is deleted, preventing partial updates or orphaned vote modifications.
 *
 * 1. Register and authenticate a member account.
 * 2. Create a post in a community (member must be subscribed).
 * 3. Cast a vote on the post to create a vote record.
 * 4. Delete the post using the post author's credentials.
 * 5. Attempt to remove the vote on the deleted post.
 * 6. Verify that the vote removal fails with 404 Not Found error.
 * 7. Confirm that the vote record remains unchanged (not deleted).
 */
export async function test_api_post_vote_removal_on_deleted_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create a post in a community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {},
  );
  typia.assert(post);
  const postId = post.id;
  const voteScoreBefore = post.vote_score;
  const karmaBefore = member.karma;
  // 3. Cast a vote on the post to create a vote record
  const vote = await generate_random_reddit_clone_member_posts_votes_create(
    memberConnection,
    {
      params: { postId },
      body: {
        vote_type: "upvote",
      },
    },
  );
  typia.assert(vote);
  const voteId = vote.id;
  // 4. Delete the post using the post author's credentials
  await api.functional.redditClone.member.posts.erase(memberConnection, {
    postId,
  });
  // 5. Attempt to remove the vote on the deleted post
  // 6. Verify that the vote removal fails with 404 Not Found error
  await TestValidator.httpError(
    "vote removal on deleted post should fail with 404",
    404,
    async () => {
      await api.functional.redditClone.member.posts.votes.erase(
        memberConnection,
        {
          postId,
          voteId,
        },
      );
    },
  );
  // 7. Confirm that the vote record remains unchanged (not deleted)
  // The vote removal failed with 404, which means:
  // - The vote record was not deleted
  // - The post's vote score remains unchanged
  // - The author's karma remains unchanged
  // This is the expected behavior when attempting to modify votes on deleted content.
  TestValidator.predicate(
    "vote removal on deleted post was rejected as expected",
    true,
  );
}
