import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEEconDiscussVoteType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussVoteType";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";
import type { IEconDiscussPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostVote";

/**
 * Switch a member's vote from up to down on a post, ensure idempotency, and
 * reject unauthenticated requests.
 *
 * Steps:
 *
 * 1. Author joins and creates a post.
 * 2. Different member (voter) joins and casts an initial upvote on the post.
 * 3. Change the vote to down; ensure it succeeds (server updates existing row).
 * 4. Call down again to validate idempotency (no error).
 * 5. Unauthenticated attempt to vote should fail.
 */
export async function test_api_post_vote_switch_up_to_down(
  connection: api.IConnection,
) {
  // 1) Author joins (Authorization set on connection)
  const authorJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const author: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: authorJoinInput,
    });
  typia.assert(author);

  // 2) Author creates a post
  const postCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IEconDiscussPost.ICreate;
  const post: IEconDiscussPost =
    await api.functional.econDiscuss.member.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);
  TestValidator.equals(
    "post should be authored by the author who created it",
    post.author_user_id,
    author.id,
  );

  // 3) Different member (voter) joins - this switches Authorization to voter
  const voterJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const voter: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: voterJoinInput });
  typia.assert(voter);
  TestValidator.notEquals(
    "voter should be a different member from the author",
    voter.id,
    author.id,
  );

  // 4) Cast initial upvote
  const upVoteBody = { vote_type: "up" } satisfies IEconDiscussPostVote.ICreate;
  await api.functional.econDiscuss.member.posts.votes.create(connection, {
    postId: post.id,
    body: upVoteBody,
  });

  // 5) Change vote to down
  const downVoteBody = {
    vote_type: "down",
  } satisfies IEconDiscussPostVote.ICreate;
  await api.functional.econDiscuss.member.posts.votes.create(connection, {
    postId: post.id,
    body: downVoteBody,
  });

  // 6) Idempotency: repeat down vote should succeed (no error)
  await api.functional.econDiscuss.member.posts.votes.create(connection, {
    postId: post.id,
    body: downVoteBody,
  });

  // 7) Negative: unauthenticated vote attempt should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated voting attempt must fail",
    async () => {
      await api.functional.econDiscuss.member.posts.votes.create(unauthConn, {
        postId: post.id,
        body: downVoteBody,
      });
    },
  );
}
