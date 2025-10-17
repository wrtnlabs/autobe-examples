import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEPollQuestionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEPollQuestionType";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPoll";
import type { IEconDiscussPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollOption";
import type { IEconDiscussPollQuestionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollQuestionType";
import type { IEconDiscussPollResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollResponse";
import type { IEconDiscussPollVisibilityMode } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollVisibilityMode";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";

/**
 * Withdraw a poll response: auth boundary and idempotent error semantics.
 *
 * Due to current API constraints (responses.create returns void and there is no
 * read/list endpoint for responses), this test focuses on what is
 * implementable:
 *
 * 1. Member joins and authenticates (token handled by SDK)
 * 2. Member creates a post
 * 3. Member creates a single_choice poll on the post (allow_vote_change=true, open
 *    window)
 * 4. Member creates two options (A, B)
 * 5. Member submits a single_choice response selecting Option A (success inferred
 *    by no error)
 * 6. DELETE withdraw with unauthenticated connection must error (auth boundary)
 * 7. DELETE withdraw called twice with the same fake responseId must consistently
 *    error (demonstrates idempotent/error-consistent behavior without asserting
 *    HTTP codes)
 */
export async function test_api_poll_response_withdraw_by_owner_idempotent(
  connection: api.IConnection,
) {
  // 1) Member joins and authenticates
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(member);

  // 2) Create a post
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        summary: RandomGenerator.paragraph({ sentences: 8 }),
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(post);

  // 3) Create a poll on the post (single_choice, always_visible, allow changes, open window)
  const now = Date.now();
  const startAt = new Date(now - 30_000).toISOString();
  const endAt = new Date(now + 2 * 60 * 60 * 1000).toISOString();
  const poll = await api.functional.econDiscuss.member.posts.poll.create(
    connection,
    {
      postId: post.id,
      body: {
        question: RandomGenerator.paragraph({ sentences: 6 }),
        questionType: "single_choice",
        visibilityMode: "always_visible",
        expertOnly: false,
        allowVoteChange: true,
        startAt,
        endAt,
      } satisfies IEconDiscussPoll.ICreate,
    },
  );
  typia.assert(poll);
  TestValidator.equals("poll is linked to created post", poll.postId, post.id);

  // 4) Create two options
  const optionA =
    await api.functional.econDiscuss.member.posts.poll.options.create(
      connection,
      {
        postId: post.id,
        body: {
          text: "Option A",
          position: 0,
        } satisfies IEconDiscussPollOption.ICreate,
      },
    );
  typia.assert(optionA);

  const optionB =
    await api.functional.econDiscuss.member.posts.poll.options.create(
      connection,
      {
        postId: post.id,
        body: {
          text: "Option B",
          position: 1,
        } satisfies IEconDiscussPollOption.ICreate,
      },
    );
  typia.assert(optionB);

  // 5) Submit a single_choice response selecting Option A
  await api.functional.econDiscuss.member.posts.poll.responses.create(
    connection,
    {
      postId: post.id,
      body: {
        questionType: "single_choice",
        optionId: optionA.id,
      } satisfies IEconDiscussPollResponse.ICreate,
    },
  );

  // We cannot read actual responseId due to missing read/list APIs,
  // so use a fabricated UUID for boundary/idempotency checks.
  const fakeResponseId = typia.random<string & tags.Format<"uuid">>();

  // 6) Unauthenticated withdraw attempt must error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated client cannot withdraw a poll response",
    async () => {
      await api.functional.econDiscuss.member.posts.poll.responses.erase(
        unauthConn,
        { postId: post.id, responseId: fakeResponseId },
      );
    },
  );

  // 7) Authorized withdraw on non-existent response must error
  await TestValidator.error(
    "authorized withdraw on non-existent response should fail",
    async () => {
      await api.functional.econDiscuss.member.posts.poll.responses.erase(
        connection,
        { postId: post.id, responseId: fakeResponseId },
      );
    },
  );

  // Repeat the same call to confirm consistent error behavior (idempotent error semantics)
  await TestValidator.error(
    "repeating withdraw call on same non-existent response also fails",
    async () => {
      await api.functional.econDiscuss.member.posts.poll.responses.erase(
        connection,
        { postId: post.id, responseId: fakeResponseId },
      );
    },
  );
}
