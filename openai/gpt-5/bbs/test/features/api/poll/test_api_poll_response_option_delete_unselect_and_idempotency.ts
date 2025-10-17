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

export async function test_api_poll_response_option_delete_unselect_and_idempotency(
  connection: api.IConnection,
) {
  /**
   * Validate removing a poll response selection (response-option) with
   * permissions, idempotency, and policy constraints.
   *
   * Steps
   *
   * 1. Member A joins, creates Post P1, and attaches a multiple_choice poll with
   *    allowVoteChange=true
   * 2. Member A creates a response by appending selections; capture responseId and
   *    responseOptionId
   * 3. DELETE the selection as Member A (success) and DELETE again (idempotent
   *    success)
   * 4. Member B joins and attempts to DELETE Member A’s selection (should error)
   * 5. Member B creates Post P2 and attaches a poll with allowVoteChange=false
   * 6. Member B creates a response/selection, then attempts DELETE (should error
   *    due to policy)
   * 7. Linkage integrity: attempt DELETE for P2 selection using P1 postId (should
   *    error)
   */

  // 1) Member A joins
  const emailA: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const passwordA: string = RandomGenerator.alphaNumeric(12);
  const authA = await api.functional.auth.member.join(connection, {
    body: {
      email: emailA,
      password: passwordA,
      display_name: RandomGenerator.name(2),
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(authA);

  // Member A creates Post P1
  const post1 = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(post1);

  // Member A attaches Poll1 (multiple_choice, allowVoteChange=true) with options
  const poll1 = await api.functional.econDiscuss.member.posts.poll.create(
    connection,
    {
      postId: post1.id,
      body: {
        question: RandomGenerator.paragraph({ sentences: 6 }),
        questionType: "multiple_choice",
        visibilityMode: "visible_after_vote",
        expertOnly: false,
        allowVoteChange: true,
        minSelections: 1,
        maxSelections: 3,
        options: [
          { text: "Option A" },
          { text: "Option B" },
          { text: "Option C" },
        ] satisfies IEconDiscussPollOption.ICreate[],
      } satisfies IEconDiscussPoll.ICreate,
    },
  );
  typia.assert(poll1);
  TestValidator.equals("poll1 is attached to post1", poll1.postId, post1.id);
  TestValidator.predicate(
    "poll1 should have at least 2 options",
    poll1.options.length >= 2,
  );

  // 2) Member A appends selections and captures response/selection IDs
  const addResp1 =
    await api.functional.econDiscuss.member.posts.poll.responses.options.addOptions(
      connection,
      {
        postId: post1.id,
        // Response id is obtained/returned by API; provide a UUID and capture response from output
        responseId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          selections: [
            { optionId: poll1.options[0].id, position: null },
            { optionId: poll1.options[1].id, position: null },
          ],
        } satisfies IEconDiscussPollResponseOption.ICreate,
      },
    );
  typia.assert(addResp1);
  TestValidator.predicate(
    "response should contain at least one selection after append",
    addResp1.selections.length >= 1,
  );
  const responseId1 = addResp1.id; // for subsequent DELETE
  const responseOptionId1 = addResp1.selections[0].id;

  // 3) DELETE as owner (Member A) and verify idempotency by repeating
  await api.functional.econDiscuss.member.posts.poll.responses.options.erase(
    connection,
    {
      postId: post1.id,
      responseId: responseId1,
      responseOptionId: responseOptionId1,
    },
  );
  // repeat DELETE (idempotency)
  await api.functional.econDiscuss.member.posts.poll.responses.options.erase(
    connection,
    {
      postId: post1.id,
      responseId: responseId1,
      responseOptionId: responseOptionId1,
    },
  );

  // 4) Member B joins and attempts to DELETE Member A’s selection (should error)
  const emailB: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const passwordB: string = RandomGenerator.alphaNumeric(12);
  const authB = await api.functional.auth.member.join(connection, {
    body: {
      email: emailB,
      password: passwordB,
      display_name: RandomGenerator.name(2),
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(authB);

  await TestValidator.error(
    "other member cannot delete owner's selection",
    async () => {
      await api.functional.econDiscuss.member.posts.poll.responses.options.erase(
        connection,
        {
          postId: post1.id,
          responseId: responseId1,
          responseOptionId: responseOptionId1,
        },
      );
    },
  );

  // 5) Member B creates Post P2 and poll with allowVoteChange=false
  const post2 = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(post2);

  const poll2 = await api.functional.econDiscuss.member.posts.poll.create(
    connection,
    {
      postId: post2.id,
      body: {
        question: RandomGenerator.paragraph({ sentences: 6 }),
        questionType: "multiple_choice",
        visibilityMode: "visible_after_vote",
        expertOnly: false,
        allowVoteChange: false,
        minSelections: 1,
        maxSelections: 2,
        options: [
          { text: "X" },
          { text: "Y" },
        ] satisfies IEconDiscussPollOption.ICreate[],
      } satisfies IEconDiscussPoll.ICreate,
    },
  );
  typia.assert(poll2);
  TestValidator.equals("poll2 is attached to post2", poll2.postId, post2.id);

  // Member B appends a selection to obtain response/selection IDs for P2
  const addResp2 =
    await api.functional.econDiscuss.member.posts.poll.responses.options.addOptions(
      connection,
      {
        postId: post2.id,
        responseId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          selections: [{ optionId: poll2.options[0].id, position: null }],
        } satisfies IEconDiscussPollResponseOption.ICreate,
      },
    );
  typia.assert(addResp2);
  TestValidator.predicate(
    "response for P2 should contain at least one selection",
    addResp2.selections.length >= 1,
  );

  // 6) Policy constraint: allowVoteChange=false → owner cannot delete
  await TestValidator.error(
    "owner cannot delete selection when allowVoteChange=false",
    async () => {
      await api.functional.econDiscuss.member.posts.poll.responses.options.erase(
        connection,
        {
          postId: post2.id,
          responseId: addResp2.id,
          responseOptionId: addResp2.selections[0].id,
        },
      );
    },
  );

  // 7) Linkage integrity: mismatched postId with response/option from P2 → error
  await TestValidator.error(
    "mismatched linkage (postId vs response/option) should fail",
    async () => {
      await api.functional.econDiscuss.member.posts.poll.responses.options.erase(
        connection,
        {
          postId: post1.id, // wrong post for these response identifiers
          responseId: addResp2.id,
          responseOptionId: addResp2.selections[0].id,
        },
      );
    },
  );
}
