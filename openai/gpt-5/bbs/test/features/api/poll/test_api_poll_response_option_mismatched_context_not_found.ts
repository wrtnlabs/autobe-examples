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
 * Validate response-option scoping across posts (IDOR guard).
 *
 * This test creates two posts (A and B), attaches a single_choice poll to each,
 * and adds one option to Post A's poll. It then appends a selection to a poll
 * response under Post A and captures the resulting response and selection IDs.
 * Finally, it verifies:
 *
 * 1. Positive: using Post A's postId to fetch the created response-option works.
 * 2. Negative: using Post B's postId with the same response/option IDs fails
 *    (should error), ensuring strict post→poll→response→responseOption
 *    linkage.
 *
 * Steps
 *
 * 1. Member joins to obtain authenticated context
 * 2. Create Post A and Post B
 * 3. Create polls for each post (single_choice)
 * 4. Create an option for Post A's poll
 * 5. Add selection(s) to a response under Post A’s poll via addOptions to obtain
 *    response and selection IDs
 * 6. GET the selection with Post A (success)
 * 7. GET the same selection with Post B (error expected)
 */
export async function test_api_poll_response_option_mismatched_context_not_found(
  connection: api.IConnection,
) {
  // 1) Member joins (auth) — SDK injects Authorization header automatically
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // >= 8 chars
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const authorized = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 2) Create Post A and Post B
  const postABody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IEconDiscussPost.ICreate;
  const postA = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: postABody,
    },
  );
  typia.assert(postA);

  const postBBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IEconDiscussPost.ICreate;
  const postB = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: postBBody,
    },
  );
  typia.assert(postB);

  // 3) Create polls for each post (single_choice)
  const pollCreate = {
    question: RandomGenerator.paragraph({ sentences: 2 }),
    questionType: "single_choice" as IEconDiscussPollQuestionType,
    visibilityMode: "visible_after_vote" as IEconDiscussPollVisibilityMode,
    expertOnly: false,
    allowVoteChange: true,
  } satisfies IEconDiscussPoll.ICreate;
  const pollA = await api.functional.econDiscuss.member.posts.poll.create(
    connection,
    {
      postId: postA.id,
      body: pollCreate,
    },
  );
  typia.assert(pollA);

  const pollB = await api.functional.econDiscuss.member.posts.poll.create(
    connection,
    {
      postId: postB.id,
      body: pollCreate,
    },
  );
  typia.assert(pollB);

  // 4) Create at least one option for Post A’s poll
  const optionABody = {
    text: RandomGenerator.paragraph({ sentences: 2 }),
    position: 1,
  } satisfies IEconDiscussPollOption.ICreate;
  const optionA =
    await api.functional.econDiscuss.member.posts.poll.options.create(
      connection,
      {
        postId: postA.id,
        body: optionABody,
      },
    );
  typia.assert(optionA);

  // 5) Append a selection to a response under Post A’s poll.
  //    - Use addOptions and capture the returned response and selection IDs.
  //    - Using a generated responseId here ensures we can reference it in path params;
  //      the authoritative id is taken from the response returned by the API.
  const generatedResponseId = typia.random<string & tags.Format<"uuid">>();
  const addOptionsBody = {
    selections: [
      {
        optionId: optionA.id,
      },
    ],
  } satisfies IEconDiscussPollResponseOption.ICreate;
  const appended =
    await api.functional.econDiscuss.member.posts.poll.responses.options.addOptions(
      connection,
      {
        postId: postA.id,
        responseId: generatedResponseId,
        body: addOptionsBody,
      },
    );
  typia.assert(appended);

  // Ensure we have at least one selection
  await TestValidator.predicate(
    "response should contain at least one selection after addOptions",
    async () => appended.selections.length > 0,
  );
  const selectionId = appended.selections[0]!.id;

  // 6) Positive fetch: correct lineage with Post A
  const fetchedA =
    await api.functional.econDiscuss.member.posts.poll.responses.options.at(
      connection,
      {
        postId: postA.id,
        responseId: appended.id,
        responseOptionId: selectionId,
      },
    );
  typia.assert(fetchedA);
  TestValidator.equals(
    "fetched selection belongs to the same response",
    fetchedA.responseId,
    appended.id,
  );
  TestValidator.equals(
    "fetched selection id matches created selection id",
    fetchedA.id,
    selectionId,
  );

  // 7) Negative fetch: mismatched postId (Post B) must error
  await TestValidator.error(
    "mismatched postId must not access another post’s response-option",
    async () => {
      await api.functional.econDiscuss.member.posts.poll.responses.options.at(
        connection,
        {
          postId: postB.id,
          responseId: appended.id,
          responseOptionId: selectionId,
        },
      );
    },
  );
}
