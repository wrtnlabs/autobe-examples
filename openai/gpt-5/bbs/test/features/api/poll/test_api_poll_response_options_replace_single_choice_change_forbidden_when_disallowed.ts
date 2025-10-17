import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEEconDiscussPollResponseStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussPollResponseStatus";
import type { IEPollQuestionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEPollQuestionType";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPoll";
import type { IEconDiscussPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollOption";
import type { IEconDiscussPollQuestionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollQuestionType";
import type { IEconDiscussPollResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollResponse";
import type { IEconDiscussPollResponseOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollResponseOption";
import type { IEconDiscussPollVisibilityMode } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollVisibilityMode";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";

/**
 * Validate that switching a single_choice poll selection is forbidden when
 * allowVoteChange=false.
 *
 * Scenario adaptation:
 *
 * - The replace-options endpoint requires responseId, but there's no read/list
 *   API to obtain it after creation and the create endpoint returns void.
 *   Therefore, we validate the "no vote change" rule via duplicate POST
 *   submissions (creation) and cover the replace-options endpoint through an
 *   unauthenticated access error case.
 *
 * Steps:
 *
 * 1. Join a member (auth handled by SDK).
 * 2. Create a post.
 * 3. Create a single_choice poll with allowVoteChange=false and two options (A,
 *    B), open window.
 * 4. Submit initial response selecting option A.
 * 5. Attempt to submit again with option B → expect error (change forbidden).
 * 6. Authentication boundary: unauthenticated PUT replace-options call → expect
 *    error.
 */
export async function test_api_poll_response_options_replace_single_choice_change_forbidden_when_disallowed(
  connection: api.IConnection,
) {
  // 1) Join a member (auth)
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(1),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(member);

  // 2) Create a post
  const post: IEconDiscussPost =
    await api.functional.econDiscuss.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IEconDiscussPost.ICreate,
    });
  typia.assert(post);

  // 3) Create a poll (single_choice, allowVoteChange=false), embed two options A/B
  const now = new Date();
  const poll: IEconDiscussPoll =
    await api.functional.econDiscuss.member.posts.poll.create(connection, {
      postId: post.id,
      body: {
        question: RandomGenerator.paragraph({ sentences: 5 }),
        questionType: "single_choice",
        visibilityMode: "always_visible",
        expertOnly: false,
        allowVoteChange: false,
        startAt: new Date(now.getTime() - 60_000).toISOString(), // opened 1 minute ago
        endAt: new Date(now.getTime() + 60 * 60_000).toISOString(), // closes in 1 hour
        options: [
          { text: "Option A", position: 1 },
          { text: "Option B", position: 2 },
        ],
      } satisfies IEconDiscussPoll.ICreate,
    });
  typia.assert(poll);
  TestValidator.equals(
    "poll is single_choice",
    poll.questionType,
    "single_choice",
  );
  TestValidator.equals(
    "poll disallows vote change",
    poll.allowVoteChange,
    false,
  );
  await TestValidator.predicate(
    "poll contains at least two options",
    async () => poll.options.length >= 2,
  );

  // Select A and B from returned options (by position if available)
  const optionA: IEconDiscussPollOption =
    poll.options.find((o) => o.position === 1) ?? poll.options[0];
  const optionB: IEconDiscussPollOption =
    poll.options.find((o) => o.position === 2) ??
    poll.options[1] ??
    poll.options[0];

  // 4) Submit initial single_choice response with Option A
  await api.functional.econDiscuss.member.posts.poll.responses.create(
    connection,
    {
      postId: post.id,
      body: {
        questionType: "single_choice" as IEPollQuestionType,
        optionId: optionA.id,
      } satisfies IEconDiscussPollResponse.ICreate,
    },
  );

  // 5) Attempt to change selection to Option B → expect error due to allowVoteChange=false
  await TestValidator.error(
    "second submission with different option is forbidden when allowVoteChange=false",
    async () => {
      await api.functional.econDiscuss.member.posts.poll.responses.create(
        connection,
        {
          postId: post.id,
          body: {
            questionType: "single_choice" as IEPollQuestionType,
            optionId: optionB.id,
          } satisfies IEconDiscussPollResponse.ICreate,
        },
      );
    },
  );

  // 6) Authentication boundary for replace-options endpoint (unauthenticated should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated client cannot replace poll response options",
    async () => {
      await api.functional.econDiscuss.member.posts.poll.responses.options.putByPostidAndResponseid(
        unauthConn,
        {
          postId: post.id,
          responseId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            optionIds: [optionA.id],
          } satisfies IEconDiscussPollResponseOption.IRequest.IByOptionIds,
        },
      );
    },
  );
}
