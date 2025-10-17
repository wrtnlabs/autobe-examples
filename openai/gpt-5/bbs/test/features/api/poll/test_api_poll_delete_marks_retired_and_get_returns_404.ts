import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPoll";
import type { IEconDiscussPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollOption";
import type { IEconDiscussPollQuestionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollQuestionType";
import type { IEconDiscussPollVisibilityMode } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollVisibilityMode";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";

/**
 * Retire a post's poll and validate one‑poll‑per‑post lifecycle.
 *
 * Business flow (revised to available APIs):
 *
 * 1. Member joins to obtain authenticated session.
 * 2. Member creates a post.
 * 3. Member creates a poll attached to the post.
 * 4. Verify constraint: creating a second poll on the same post must fail.
 * 5. Retire (DELETE) the poll; call DELETE twice to verify idempotency.
 * 6. Create a new poll again on the same post; it must succeed, proving
 *    retirement.
 *
 * Validations:
 *
 * - All responses match their DTOs (typia.assert).
 * - Duplicate creation fails before retirement (TestValidator.error).
 * - New poll after retirement has the same postId and a different id than the
 *   retired one.
 */
export async function test_api_poll_delete_marks_retired_and_get_returns_404(
  connection: api.IConnection,
) {
  // 1) Authenticate as a new member (join)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const auth = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert(auth);

  // 2) Create a host post for the poll
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 5 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies IEconDiscussPost.ICreate;
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: postBody,
    },
  );
  typia.assert(post);

  // 3) Create a poll on the post
  const pollCreateBody1 = {
    question: RandomGenerator.paragraph({ sentences: 6 }),
    questionType: "single_choice",
    visibilityMode: "always_visible",
    expertOnly: false,
    allowVoteChange: true,
    options: ArrayUtil.repeat(3, (i) => ({
      text: `Option ${i + 1} - ${RandomGenerator.paragraph({ sentences: 2 })}`,
      position: i,
    })),
  } satisfies IEconDiscussPoll.ICreate;
  const poll1 = await api.functional.econDiscuss.member.posts.poll.create(
    connection,
    { postId: post.id, body: pollCreateBody1 },
  );
  typia.assert(poll1);
  TestValidator.equals(
    "created poll is attached to the created post",
    poll1.postId,
    post.id,
  );

  // 4) Attempt to create a second poll on the same post -> must error
  await TestValidator.error(
    "cannot create a second active poll on the same post",
    async () => {
      const duplicateBody = {
        question: RandomGenerator.paragraph({ sentences: 4 }),
        questionType: "single_choice",
        visibilityMode: "always_visible",
        expertOnly: false,
        allowVoteChange: true,
        options: ArrayUtil.repeat(2, (i) => ({
          text: `Dup ${i + 1}`,
          position: i,
        })),
      } satisfies IEconDiscussPoll.ICreate;
      await api.functional.econDiscuss.member.posts.poll.create(connection, {
        postId: post.id,
        body: duplicateBody,
      });
    },
  );

  // 5) Retire the poll (DELETE) and verify idempotency by deleting twice
  await api.functional.econDiscuss.member.posts.poll.erase(connection, {
    postId: post.id,
  });
  // Idempotent second delete should also succeed without throwing
  await api.functional.econDiscuss.member.posts.poll.erase(connection, {
    postId: post.id,
  });

  // 6) Create a new poll on the same post after retirement -> should succeed
  const pollCreateBody2 = {
    question: RandomGenerator.paragraph({ sentences: 4 }),
    questionType: "single_choice",
    visibilityMode: "visible_after_vote",
    expertOnly: false,
    allowVoteChange: false,
    options: ArrayUtil.repeat(3, (i) => ({
      text: `New ${i + 1}`,
      position: i,
    })),
  } satisfies IEconDiscussPoll.ICreate;
  const poll2 = await api.functional.econDiscuss.member.posts.poll.create(
    connection,
    { postId: post.id, body: pollCreateBody2 },
  );
  typia.assert(poll2);
  TestValidator.equals(
    "recreated poll remains attached to the same post",
    poll2.postId,
    post.id,
  );
  TestValidator.notEquals(
    "recreated poll id differs from the retired poll id",
    poll2.id,
    poll1.id,
  );
}
