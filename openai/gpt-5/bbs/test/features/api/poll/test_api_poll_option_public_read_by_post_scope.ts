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
 * Public read of a specific poll option by (postId, optionId) with association
 * checks.
 *
 * Workflow
 *
 * 1. Register Member A (join) to obtain authenticated context.
 * 2. Create a Post owned by Member A.
 * 3. Attach a single_choice Poll to the Post (always_visible, non-expert-only).
 * 4. Create at least two Poll Options (positions 1 and 2).
 * 5. GET the first option via public endpoint using (postId, optionId) and
 *    validate:
 *
 *    - Response conforms to IEconDiscussPollOption (typia.assert).
 *    - Returned option.id equals created option.id.
 *    - Returned option.pollId equals created poll.id.
 *    - Same GET succeeds on unauthenticated connection as well (public access).
 * 6. Negative (cross-association): create another Post + Poll + Option, then
 *    attempt to GET using the first postId with the second optionId → expect
 *    error.
 * 7. Negative (non-existent resource): use a random UUID as optionId for the first
 *    postId → expect error.
 */
export async function test_api_poll_option_public_read_by_post_scope(
  connection: api.IConnection,
) {
  // 1) Register Member A
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const memberA = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert(memberA);

  // 2) Create a Post
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IEconDiscussPost.ICreate;
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    { body: postBody },
  );
  typia.assert(post);

  // 3) Attach a Poll to the Post
  const pollBody = {
    question: RandomGenerator.paragraph({ sentences: 6 }),
    questionType: "single_choice",
    visibilityMode: "always_visible",
    expertOnly: false,
    allowVoteChange: true,
  } satisfies IEconDiscussPoll.ICreate;
  const poll = await api.functional.econDiscuss.member.posts.poll.create(
    connection,
    {
      postId: post.id,
      body: pollBody,
    },
  );
  typia.assert(poll);
  TestValidator.equals(
    "poll is attached to the created post",
    poll.postId,
    post.id,
  );

  // 4) Create two Poll Options with deterministic positions
  const optionBody1 = {
    text: `Option ${RandomGenerator.paragraph({ sentences: 1 })}`,
    position: 1,
  } satisfies IEconDiscussPollOption.ICreate;
  const option1 =
    await api.functional.econDiscuss.member.posts.poll.options.create(
      connection,
      {
        postId: post.id,
        body: optionBody1,
      },
    );
  typia.assert(option1);

  const optionBody2 = {
    text: `Option ${RandomGenerator.paragraph({ sentences: 2 })}`,
    position: 2,
  } satisfies IEconDiscussPollOption.ICreate;
  const option2 =
    await api.functional.econDiscuss.member.posts.poll.options.create(
      connection,
      {
        postId: post.id,
        body: optionBody2,
      },
    );
  typia.assert(option2);

  // 5) Public GET the first option via (postId, optionId)
  const read1 = await api.functional.econDiscuss.posts.poll.options.at(
    connection,
    {
      postId: post.id,
      optionId: option1.id,
    },
  );
  typia.assert(read1);
  TestValidator.equals(
    "read option id equals created option id",
    read1.id,
    option1.id,
  );
  TestValidator.equals(
    "read option belongs to the created poll",
    read1.pollId,
    poll.id,
  );

  // Also verify the public nature using an unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const read1Public = await api.functional.econDiscuss.posts.poll.options.at(
    unauthConn,
    {
      postId: post.id,
      optionId: option1.id,
    },
  );
  typia.assert(read1Public);
  TestValidator.equals(
    "public read returns same option id",
    read1Public.id,
    option1.id,
  );
  TestValidator.equals(
    "public read option belongs to same poll",
    read1Public.pollId,
    poll.id,
  );

  // 6) Negative (cross-association): create second post, poll, and option
  const postBodyB = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IEconDiscussPost.ICreate;
  const postB = await api.functional.econDiscuss.member.posts.create(
    connection,
    { body: postBodyB },
  );
  typia.assert(postB);

  const pollBodyB = {
    question: RandomGenerator.paragraph({ sentences: 5 }),
    questionType: "single_choice",
    visibilityMode: "always_visible",
    expertOnly: false,
    allowVoteChange: true,
  } satisfies IEconDiscussPoll.ICreate;
  const pollB = await api.functional.econDiscuss.member.posts.poll.create(
    connection,
    {
      postId: postB.id,
      body: pollBodyB,
    },
  );
  typia.assert(pollB);

  const optionBodyB = {
    text: `Foreign ${RandomGenerator.paragraph({ sentences: 1 })}`,
    position: 1,
  } satisfies IEconDiscussPollOption.ICreate;
  const optionB =
    await api.functional.econDiscuss.member.posts.poll.options.create(
      connection,
      {
        postId: postB.id,
        body: optionBodyB,
      },
    );
  typia.assert(optionB);

  // Attempt to read foreign option with the first postId (should error)
  await TestValidator.error(
    "cross-association must not resolve: option from postB under post A's scope",
    async () => {
      await api.functional.econDiscuss.posts.poll.options.at(connection, {
        postId: post.id, // from first post
        optionId: optionB.id, // from second post's poll
      });
    },
  );

  // 7) Negative (non-existent optionId)
  let nonExistentOptionId = typia.random<string & tags.Format<"uuid">>();
  // reduce accidental collision with existing ones
  if (
    nonExistentOptionId === option1.id ||
    nonExistentOptionId === option2.id ||
    nonExistentOptionId === optionB.id
  ) {
    nonExistentOptionId = typia.random<string & tags.Format<"uuid">>();
  }
  await TestValidator.error(
    "non-existent option id must not be found",
    async () => {
      await api.functional.econDiscuss.posts.poll.options.at(connection, {
        postId: post.id,
        optionId: nonExistentOptionId,
      });
    },
  );
}
