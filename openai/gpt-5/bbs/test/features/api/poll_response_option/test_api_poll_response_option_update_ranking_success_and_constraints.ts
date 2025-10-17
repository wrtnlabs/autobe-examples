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
 * Update ranking poll response selection and validate permissions/policies.
 *
 * Business flow:
 *
 * 1. Member A joins and creates post P1.
 * 2. Member A attaches a ranking poll on P1 with allowVoteChange=true and an open
 *    time window.
 * 3. Member A creates three poll options.
 * 4. Member A creates a response and appends two selections with positions 1 and
 *    2.
 * 5. Update the second selection to position 3 and validate business expectations.
 * 6. Member B joins and attempts to update A's selection → expect an error.
 * 7. Create another post P2 with allowVoteChange=false, add one selection, then
 *    attempt to update → expect an error.
 *
 * Notes:
 *
 * - Authentication switching is done by calling auth.member.join with different
 *   accounts.
 * - We never touch connection.headers manually; the SDK manages it.
 * - Error expectations do not assert specific HTTP status codes.
 */
export async function test_api_poll_response_option_update_ranking_success_and_constraints(
  connection: api.IConnection,
) {
  // 1) Member A joins
  const memberA = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12), // >= 8 chars
      display_name: RandomGenerator.name(),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(memberA);

  // 2) Member A creates post P1
  const post1 = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(post1);

  // 3) Create a ranking poll on P1 with allowVoteChange=true and open window
  const now = Date.now();
  const poll1 = await api.functional.econDiscuss.member.posts.poll.create(
    connection,
    {
      postId: post1.id,
      body: {
        question: RandomGenerator.paragraph({ sentences: 6 }),
        questionType: "ranking",
        visibilityMode: "always_visible",
        expertOnly: false,
        allowVoteChange: true,
        startAt: new Date(now - 60_000).toISOString(),
        endAt: new Date(now + 60 * 60_000).toISOString(),
      } satisfies IEconDiscussPoll.ICreate,
    },
  );
  typia.assert(poll1);

  // 4) Create three options for poll1
  const option1 =
    await api.functional.econDiscuss.member.posts.poll.options.create(
      connection,
      {
        postId: post1.id,
        body: {
          text: RandomGenerator.paragraph({ sentences: 2 }),
          position: 1,
        } satisfies IEconDiscussPollOption.ICreate,
      },
    );
  typia.assert(option1);
  const option2 =
    await api.functional.econDiscuss.member.posts.poll.options.create(
      connection,
      {
        postId: post1.id,
        body: {
          text: RandomGenerator.paragraph({ sentences: 2 }),
          position: 2,
        } satisfies IEconDiscussPollOption.ICreate,
      },
    );
  typia.assert(option2);
  const option3 =
    await api.functional.econDiscuss.member.posts.poll.options.create(
      connection,
      {
        postId: post1.id,
        body: {
          text: RandomGenerator.paragraph({ sentences: 2 }),
          position: 3,
        } satisfies IEconDiscussPollOption.ICreate,
      },
    );
  typia.assert(option3);

  // 5) Create a response and append two selections with positions 1 and 2
  const responseId1 = typia.random<string & tags.Format<"uuid">>();
  const resp1 =
    await api.functional.econDiscuss.member.posts.poll.responses.options.addOptions(
      connection,
      {
        postId: post1.id,
        responseId: responseId1,
        body: {
          selections: [
            { optionId: option1.id, position: 1 },
            { optionId: option2.id, position: 2 },
          ],
        } satisfies IEconDiscussPollResponseOption.ICreate,
      },
    );
  typia.assert(resp1);

  // Confirm two selections exist and positions are unique and within 1..3
  const positions = resp1.selections.map((s) => s.position ?? null);
  TestValidator.equals(
    "two selections should be created",
    resp1.selections.length,
    2,
  );
  TestValidator.predicate(
    "positions are unique",
    positions[0] !== null &&
      positions[1] !== null &&
      positions[0] !== positions[1],
  );
  TestValidator.predicate(
    "positions are within range 1..3",
    positions.every((p) => p !== null && p >= 1 && p <= 3),
  );

  // Find the selection with position 2 (to update it to 3)
  const sel2 =
    resp1.selections.find(
      (s) =>
        s.position !== null && s.position !== undefined && s.position === 2,
    ) ?? resp1.selections[resp1.selections.length - 1];
  // 6) Update second selection’s position to 3
  const updated =
    await api.functional.econDiscuss.member.posts.poll.responses.options.update(
      connection,
      {
        postId: post1.id,
        responseId: resp1.id,
        responseOptionId: sel2.id,
        body: {
          position: 3,
        } satisfies IEconDiscussPollResponseOption.IUpdate,
      },
    );
  typia.assert(updated);
  const updatedPos = typia.assert<number & tags.Type<"int32">>(
    updated.position!,
  );
  TestValidator.equals("updated position should be 3", updatedPos, 3);
  TestValidator.predicate(
    "updated position not colliding with previous ones",
    updatedPos !== 1 && updatedPos !== 2,
  );
  TestValidator.predicate(
    "updated position within range 1..3",
    updatedPos >= 1 && updatedPos <= 3,
  );

  // 7) Member B joins and attempts to update A's selection -> expect error
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
    "other member cannot update another user's selection",
    async () => {
      await api.functional.econDiscuss.member.posts.poll.responses.options.update(
        connection,
        {
          postId: post1.id,
          responseId: resp1.id,
          responseOptionId: sel2.id,
          body: {
            position: 1,
          } satisfies IEconDiscussPollResponseOption.IUpdate,
        },
      );
    },
  );

  // 8) Create post P2 with allowVoteChange=false, add one selection, then attempt update -> expect error
  // Switch back to member A by joining again as A (to own P2 and its poll)
  const memberA_again = await api.functional.auth.member.join(connection, {
    body: {
      email: memberA.member?.id
        ? typia.random<string & tags.Format<"email">>()
        : typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(memberA_again);

  const post2 = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
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
        question: RandomGenerator.paragraph({ sentences: 5 }),
        questionType: "ranking",
        visibilityMode: "always_visible",
        expertOnly: false,
        allowVoteChange: false,
        startAt: new Date(Date.now() - 60_000).toISOString(),
        endAt: new Date(Date.now() + 60 * 60_000).toISOString(),
      } satisfies IEconDiscussPoll.ICreate,
    },
  );
  typia.assert(poll2);

  const p2opt1 =
    await api.functional.econDiscuss.member.posts.poll.options.create(
      connection,
      {
        postId: post2.id,
        body: {
          text: RandomGenerator.paragraph({ sentences: 2 }),
          position: 1,
        } satisfies IEconDiscussPollOption.ICreate,
      },
    );
  typia.assert(p2opt1);
  const p2opt2 =
    await api.functional.econDiscuss.member.posts.poll.options.create(
      connection,
      {
        postId: post2.id,
        body: {
          text: RandomGenerator.paragraph({ sentences: 2 }),
          position: 2,
        } satisfies IEconDiscussPollOption.ICreate,
      },
    );
  typia.assert(p2opt2);

  const responseId2 = typia.random<string & tags.Format<"uuid">>();
  const resp2 =
    await api.functional.econDiscuss.member.posts.poll.responses.options.addOptions(
      connection,
      {
        postId: post2.id,
        responseId: responseId2,
        body: {
          selections: [{ optionId: p2opt1.id, position: 1 }],
        } satisfies IEconDiscussPollResponseOption.ICreate,
      },
    );
  typia.assert(resp2);
  const p2sel1 = resp2.selections[0];

  await TestValidator.error(
    "updates should be rejected when allowVoteChange=false",
    async () => {
      await api.functional.econDiscuss.member.posts.poll.responses.options.update(
        connection,
        {
          postId: post2.id,
          responseId: resp2.id,
          responseOptionId: p2sel1.id,
          body: {
            position: 2,
          } satisfies IEconDiscussPollResponseOption.IUpdate,
        },
      );
    },
  );
}
