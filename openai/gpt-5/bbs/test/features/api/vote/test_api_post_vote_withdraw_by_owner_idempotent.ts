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
 * Withdraw own vote on a post and verify idempotency with an unauthenticated
 * denial check.
 *
 * Business context:
 *
 * - A member can cast a vote on another member’s post. They can later withdraw
 *   their vote.
 * - Withdrawing is lifecycle-based (status becomes withdrawn) and should be
 *   idempotent.
 * - Unauthenticated requests must be rejected by the server.
 *
 * Steps:
 *
 * 1. Author joins and creates a post.
 * 2. Voter joins and casts an "up" vote on that post.
 * 3. Voter withdraws the vote (DELETE
 *    /econDiscuss/member/posts/{postId}/votes/self) — success (no throw).
 * 4. Withdraw again to verify idempotency — success (no throw) and assert via
 *    predicate flag.
 * 5. Unauthenticated attempt to withdraw is rejected (error expected).
 */
export async function test_api_post_vote_withdraw_by_owner_idempotent(
  connection: api.IConnection,
) {
  // 1) Author joins
  const authorJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const authorAuth: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: authorJoinBody,
    });
  typia.assert(authorAuth);

  // Author creates a post
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
    "created post's author should be the author member",
    post.author_user_id,
    authorAuth.id,
  );

  // 2) Voter joins (switches auth context on the same connection)
  const voterJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const voterAuth: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: voterJoinBody,
    });
  typia.assert(voterAuth);

  // 3) Voter casts an initial vote (up)
  const voteCreateBody = {
    vote_type: "up" as IEEconDiscussVoteType,
  } satisfies IEconDiscussPostVote.ICreate;
  await api.functional.econDiscuss.member.posts.votes.create(connection, {
    postId: post.id,
    body: voteCreateBody,
  });

  // 4) Withdraw the vote
  await api.functional.econDiscuss.member.posts.votes.self.erase(connection, {
    postId: post.id,
  });

  // 5) Idempotency: withdraw again should still succeed without error
  let secondWithdrawalSucceeded = false;
  try {
    await api.functional.econDiscuss.member.posts.votes.self.erase(connection, {
      postId: post.id,
    });
    secondWithdrawalSucceeded = true;
  } catch {
    secondWithdrawalSucceeded = false;
  }
  TestValidator.predicate(
    "second withdraw call completes without error (idempotent)",
    secondWithdrawalSucceeded,
  );

  // 6) Negative: unauthenticated call should be rejected
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated withdraw attempt should be rejected",
    async () => {
      await api.functional.econDiscuss.member.posts.votes.self.erase(
        unauthConnection,
        { postId: post.id },
      );
    },
  );
}
