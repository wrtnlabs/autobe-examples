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
 * Ensure poll structural changes are rejected after responses exist, while
 * benign updates succeed.
 *
 * Flow
 *
 * 1. Join as a new member (authentication handled by SDK) to get authorized
 *    connection
 * 2. Create a post and capture its postId
 * 3. Create a multiple_choice poll with three options and min/max selection
 *    constraints
 * 4. Submit a multiple_choice response (selecting one option)
 * 5. Attempt a restricted/invalid update after responses exist (e.g., set
 *    min_selections to > options.length)
 *
 *    - Expect an error using TestValidator.error (no specific status code assertion)
 * 6. Perform a benign update (change question text) and validate success
 */
export async function test_api_poll_update_restricted_after_responses_conflict(
  connection: api.IConnection,
) {
  // 1) Join as a new member
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: `P${RandomGenerator.alphaNumeric(12)}!`, // >= 8 chars
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(memberAuth);

  // 2) Create a post
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(post);

  // 3) Create a multiple_choice poll with options
  const poll = await api.functional.econDiscuss.member.posts.poll.create(
    connection,
    {
      postId: post.id,
      body: {
        question: RandomGenerator.paragraph({ sentences: 5 }),
        questionType: "multiple_choice",
        visibilityMode: "visible_after_vote",
        expertOnly: false,
        allowVoteChange: false,
        minSelections: 1,
        maxSelections: 2,
        options: [
          { text: RandomGenerator.paragraph({ sentences: 1 }), position: 0 },
          { text: RandomGenerator.paragraph({ sentences: 1 }), position: 1 },
          { text: RandomGenerator.paragraph({ sentences: 1 }), position: 2 },
        ] satisfies IEconDiscussPollOption.ICreate[],
      } satisfies IEconDiscussPoll.ICreate,
    },
  );
  typia.assert(poll);

  // 4) Submit a response (multiple_choice) selecting one option
  const pickedOptionId = poll.options[0]?.id;
  typia.assert<string & tags.Format<"uuid">>(pickedOptionId!);

  await api.functional.econDiscuss.member.posts.poll.responses.create(
    connection,
    {
      postId: post.id,
      body: {
        questionType: "multiple_choice",
        optionIds: [pickedOptionId],
      } satisfies IEconDiscussPollResponse.ICreate.IMultipleChoice,
    },
  );

  // 5) Attempt a restricted/invalid update after responses exist
  // Set min_selections to greater than number of options → structurally invalid
  const invalidMinSelections = poll.options.length + 1;
  await TestValidator.error(
    "reject structural/min_selections change after responses exist (invalid settings)",
    async () => {
      await api.functional.econDiscuss.member.posts.poll.update(connection, {
        postId: post.id,
        body: {
          min_selections: invalidMinSelections,
        } satisfies IEconDiscussPoll.IUpdate,
      });
    },
  );

  // 6) Perform a benign update (change question text) and validate success
  const newQuestion = RandomGenerator.paragraph({ sentences: 6 });
  const updated = await api.functional.econDiscuss.member.posts.poll.update(
    connection,
    {
      postId: post.id,
      body: {
        question: newQuestion,
      } satisfies IEconDiscussPoll.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "question updated successfully",
    updated.question,
    newQuestion,
  );
}
