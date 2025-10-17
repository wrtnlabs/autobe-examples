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
 * Validate that only one poll can be created per post.
 *
 * Steps:
 *
 * 1. Register a new member and obtain authentication (SDK auto-attaches token).
 * 2. Create a post to host the poll.
 * 3. Create the first poll on the post with single_choice and two options.
 * 4. Attempt to create a second poll for the same post and assert it fails.
 *
 * Notes:
 *
 * - Typia.assert() guarantees ISO 8601 timestamps and schema correctness.
 * - Do NOT assert specific HTTP status codes; only assert error occurrence for
 *   duplicate creation.
 */
export async function test_api_poll_creation_duplicate_conflict(
  connection: api.IConnection,
) {
  // 1) Authenticate (join member)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // >= 8 chars
    display_name: RandomGenerator.name(),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const authorized = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 2) Create a host post
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 5 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies IEconDiscussPost.ICreate;
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    { body: postBody },
  );
  typia.assert(post);

  // 3) Create the first poll for the post
  const now = new Date();
  const startAt = now.toISOString();
  const endAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // +1 hour

  const pollCreateBody = {
    question: RandomGenerator.paragraph({ sentences: 6 }),
    questionType: "single_choice",
    visibilityMode: "visible_after_vote",
    expertOnly: false,
    allowVoteChange: true,
    startAt,
    endAt,
    options: [
      { text: RandomGenerator.paragraph({ sentences: 3 }) },
      { text: RandomGenerator.paragraph({ sentences: 3 }) },
    ],
  } satisfies IEconDiscussPoll.ICreate;

  const poll = await api.functional.econDiscuss.member.posts.poll.create(
    connection,
    { postId: post.id, body: pollCreateBody },
  );
  typia.assert(poll);

  // Validate linkage and options count
  TestValidator.equals(
    "created poll should link to the host post",
    poll.postId,
    post.id,
  );
  TestValidator.equals(
    "created poll should contain two options",
    poll.options.length,
    2,
  );

  // 4) Attempt duplicate creation and expect error
  const pollCreateBody2 = {
    question: RandomGenerator.paragraph({ sentences: 5 }),
    questionType: "single_choice",
    visibilityMode: "visible_after_vote",
    expertOnly: false,
    allowVoteChange: true,
    startAt,
    endAt,
    options: [
      { text: RandomGenerator.paragraph({ sentences: 3 }) },
      { text: RandomGenerator.paragraph({ sentences: 3 }) },
    ],
  } satisfies IEconDiscussPoll.ICreate;

  await TestValidator.error(
    "duplicate poll creation on same post should fail",
    async () => {
      await api.functional.econDiscuss.member.posts.poll.create(connection, {
        postId: post.id,
        body: pollCreateBody2,
      });
    },
  );
}
