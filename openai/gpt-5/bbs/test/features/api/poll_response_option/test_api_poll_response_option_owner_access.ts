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
 * Validate owner-only access to a poll response-option row.
 *
 * Workflow
 *
 * 1. Register Member A and obtain token (SDK auto-sets Authorization).
 * 2. Member A creates a post.
 * 3. Attach a single_choice poll with allowVoteChange=true.
 * 4. Create two poll options for the poll.
 * 5. Append a selection to create a response-option row and obtain responseId +
 *    responseOptionId.
 * 6. As owner (Member A), GET the response-option row → success with correct
 *    linkage.
 * 7. With unauthenticated connection → expect error (authentication boundary:
 *    401-like).
 * 8. Register Member B (token switches) → GET same row → expect error (ownership
 *    boundary: 403-like).
 *
 * Notes
 *
 * - Avoid status-code-specific assertions; only validate that an error occurs.
 * - Use typia.assert for exact schema validation; no redundant type checks.
 */
export async function test_api_poll_response_option_owner_access(
  connection: api.IConnection,
) {
  // 1) Register Member A (owner)
  const memberA = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(memberA);

  // 2) Member A creates a post
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 4 }),
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(post);

  // 3) Attach a single_choice poll with allowVoteChange=true
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
      } satisfies IEconDiscussPoll.ICreate,
    },
  );
  typia.assert(poll);

  // 4) Create two poll options
  const option1 =
    await api.functional.econDiscuss.member.posts.poll.options.create(
      connection,
      {
        postId: post.id,
        body: {
          text: `Option ${RandomGenerator.name(1)}`,
          position: 1,
        } satisfies IEconDiscussPollOption.ICreate,
      },
    );
  typia.assert(option1);

  const option2 =
    await api.functional.econDiscuss.member.posts.poll.options.create(
      connection,
      {
        postId: post.id,
        body: {
          text: `Option ${RandomGenerator.name(1)}`,
          position: 2,
        } satisfies IEconDiscussPollOption.ICreate,
      },
    );
  typia.assert(option2);

  // 5) Append a selection row to create response-option linkage and resolve IDs
  //    Note: responses.create() returns void; use addOptions() response to resolve responseId and selection ids.
  const syntheticResponseId = typia.random<string & tags.Format<"uuid">>();
  const appended =
    await api.functional.econDiscuss.member.posts.poll.responses.options.addOptions(
      connection,
      {
        postId: post.id,
        responseId: syntheticResponseId,
        body: {
          selections: [
            {
              optionId: option1.id,
              position: null,
            },
          ],
        } satisfies IEconDiscussPollResponseOption.ICreate,
      },
    );
  typia.assert(appended);

  // Identify the created selection row ID (prefer the one matching option1)
  const picked =
    appended.selections.find((s) => s.optionId === option1.id) ??
    appended.selections[0]!;

  // Sanity: ensure we have a selection to read back
  TestValidator.predicate(
    "selection created and resolvable",
    picked !== undefined,
  );

  // 6) Owner reads the response-option row successfully
  const row =
    await api.functional.econDiscuss.member.posts.poll.responses.options.at(
      connection,
      {
        postId: post.id,
        responseId: appended.id,
        responseOptionId: picked.id,
      },
    );
  typia.assert(row);

  // Business validations: linkage matches and single_choice has nullish position
  TestValidator.equals(
    "responseId links to owner response",
    row.responseId,
    appended.id,
  );
  TestValidator.equals(
    "optionId links to chosen option",
    row.optionId,
    picked.optionId,
  );
  TestValidator.predicate(
    "single_choice selection has nullish position",
    row.position === null || row.position === undefined,
  );

  // 7) Unauthenticated access → expect error (no exact status assertion)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot access response-option row",
    async () => {
      await api.functional.econDiscuss.member.posts.poll.responses.options.at(
        unauthConn,
        {
          postId: post.id,
          responseId: appended.id,
          responseOptionId: picked.id,
        },
      );
    },
  );

  // 8) Register Member B then attempt access → expect error (ownership enforcement)
  const memberB = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(memberB);

  await TestValidator.error(
    "non-owner member cannot access another user's response-option row",
    async () => {
      await api.functional.econDiscuss.member.posts.poll.responses.options.at(
        connection,
        {
          postId: post.id,
          responseId: appended.id,
          responseOptionId: picked.id,
        },
      );
    },
  );
}
