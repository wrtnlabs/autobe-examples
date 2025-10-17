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

export async function test_api_poll_response_options_add_multiple_choice_capacity_and_uniqueness(
  connection: api.IConnection,
) {
  /**
   * Member joins to obtain authorization. The SDK handles token propagation
   * into connection.headers automatically.
   */
  const auth = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123",
      display_name: RandomGenerator.name(1),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(auth);

  // Create a host post for the poll
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(post);

  // Prepare an open poll window (already open and ends in the future)
  const now = Date.now();
  const startAt = new Date(now - 60_000).toISOString();
  const endAt = new Date(now + 24 * 60 * 60 * 1000).toISOString();

  // Attach a multiple_choice poll with allowVoteChange and capacity 3
  const poll = await api.functional.econDiscuss.member.posts.poll.create(
    connection,
    {
      postId: post.id,
      body: {
        question: RandomGenerator.paragraph({ sentences: 6 }),
        questionType: "multiple_choice",
        visibilityMode: "always_visible",
        expertOnly: false,
        allowVoteChange: true,
        maxSelections: 3,
        startAt,
        endAt,
      } satisfies IEconDiscussPoll.ICreate,
    },
  );
  typia.assert(poll);

  // Create 4 options (A, B, C, D) sequentially
  const options: IEconDiscussPollOption[] = await ArrayUtil.asyncRepeat(
    4,
    async (i) => {
      const label = String.fromCharCode(65 + i); // A, B, C, D
      const created =
        await api.functional.econDiscuss.member.posts.poll.options.create(
          connection,
          {
            postId: post.id,
            body: {
              text: `Option ${label}`,
              position: (i + 1) as number,
            } satisfies IEconDiscussPollOption.ICreate,
          },
        );
      typia.assert(created);
      return created;
    },
  );

  // Local integrity checks on created options
  TestValidator.predicate("exactly four options created", options.length === 4);
  TestValidator.predicate(
    "option IDs are unique",
    new Set(options.map((o) => o.id)).size === options.length,
  );

  // Prepare a target response id (unresolvable via provided APIs)
  const responseId = typia.random<string & tags.Format<"uuid">>();

  // Step 1: Append [A, B]
  const addAB =
    await api.functional.econDiscuss.member.posts.poll.responses.options.addOptions(
      connection,
      {
        postId: post.id,
        responseId,
        body: {
          selections: [
            { optionId: options[0]!.id },
            { optionId: options[1]!.id },
          ],
        } satisfies IEconDiscussPollResponseOption.ICreate,
      },
    );
  typia.assert(addAB);

  // Step 2: Append [C] to reach capacity
  const addC =
    await api.functional.econDiscuss.member.posts.poll.responses.options.addOptions(
      connection,
      {
        postId: post.id,
        responseId,
        body: {
          selections: [{ optionId: options[2]!.id }],
        } satisfies IEconDiscussPollResponseOption.ICreate,
      },
    );
  typia.assert(addC);
}
