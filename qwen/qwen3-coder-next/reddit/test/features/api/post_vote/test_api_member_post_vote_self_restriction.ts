import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneContentPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPostVote";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_posts_votes_create } from "../../../generate/generate_random_reddit_clone_posts_votes_create";
import { prepare_random_reddit_clone_content_post } from "../../../prepare/prepare_random_reddit_clone_content_post";
import { prepare_random_reddit_clone_content_post_vote } from "../../../prepare/prepare_random_reddit_clone_content_post_vote";

/**
 * Test self-vote restriction for Reddit-like platform.
 * 1. Member joins and creates a post
 * 2. Member attempts to vote on own post (should fail with self-vote restriction)
 * 3. Verify post vote score remains unchanged
 * 4. Another member can still vote on the post
 */
export async function test_api_member_post_vote_self_restriction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
    },
  });
  typia.assert(member);
  // 2. Create a post directly (using member endpoint)
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        type: "text",
        title: RandomGenerator.name(3),
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // 3. Member attempts to upvote their own post (should fail with self-vote restriction)
  await TestValidator.error("member cannot upvote own post", async () => {
    await api.functional.redditClone.posts.votes.create(memberConnection, {
      postId: post.id,
      body: {
        voteType: "upvote",
      },
    });
  });
  // 4. Member attempts to downvote their own post (should fail with self-vote restriction)
  await TestValidator.error("member cannot downvote own post", async () => {
    await api.functional.redditClone.posts.votes.create(memberConnection, {
      postId: post.id,
      body: {
        voteType: "downvote",
      },
    });
  });
  // 5. Verify post vote score remains unchanged
  TestValidator.equals("post vote score remains 0", post.vote_score, 0);
  // 6. Create second member who can vote on the post
  const anotherMemberConnection: api.IConnection = { host: connection.host };
  const anotherMember = await authorize_member_join(anotherMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
    },
  });
  typia.assert(anotherMember);
  // 7. Second member upvotes the post
  const vote = await generate_random_reddit_clone_posts_votes_create(
    anotherMemberConnection,
    {
      body: {
        voteType: "upvote",
      },
      params: {
        postId: post.id,
      },
    },
  );
  typia.assert(vote);
  // 8. Verify vote was recorded
  TestValidator.equals("vote type is upvote", vote.vote_value, 1);
}
