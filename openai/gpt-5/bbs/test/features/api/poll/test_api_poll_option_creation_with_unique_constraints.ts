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

export async function test_api_poll_option_creation_with_unique_constraints(
  connection: api.IConnection,
) {
  /**
   * Validate creating a poll option on a post’s poll with uniqueness and
   * permission rules.
   *
   * Flow:
   *
   * 1. Member A joins (authenticated session A)
   * 2. Member A creates a post
   * 3. Member A attaches a single_choice poll to the post
   * 4. Member A creates an option (text, position) → success
   * 5. Attempt duplicate text (same poll, different position) → should error
   * 6. Attempt duplicate position (same poll, different text) → should error
   * 7. Unauthenticated attempt to create an option → should error
   * 8. Member B joins (separate session); attempts to create option on A’s poll →
   *    should error
   *
   * Notes:
   *
   * - Separate connections for A and B to avoid token mix.
   * - Use typia.assert for all non-void responses.
   * - Use TestValidator.error for failure expectations (no status code
   *   assertions).
   */

  // Prepare three distinct connections: A (auth), B (auth), unauthenticated
  const connA: api.IConnection = { ...connection, headers: {} };
  const connB: api.IConnection = { ...connection, headers: {} };
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 1) Member A joins
  const memberA = await api.functional.auth.member.join(connA, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12), // MinLength<8>
      display_name: RandomGenerator.name(1),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(memberA);

  // 2) Member A creates a post
  const post = await api.functional.econDiscuss.member.posts.create(connA, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      body: RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 8,
        sentenceMax: 14,
      }),
      summary: RandomGenerator.paragraph({ sentences: 5 }),
      // scheduled_publish_at omitted
      // topicIds omitted (no topic API provided)
    } satisfies IEconDiscussPost.ICreate,
  });
  typia.assert(post);

  // 3) Member A attaches a single_choice poll to the post
  const poll = await api.functional.econDiscuss.member.posts.poll.create(
    connA,
    {
      postId: post.id,
      body: {
        question: RandomGenerator.paragraph({ sentences: 6 }),
        questionType: "single_choice" as IEconDiscussPollQuestionType,
        visibilityMode: "visible_after_vote" as IEconDiscussPollVisibilityMode,
        expertOnly: false,
        allowVoteChange: true,
        // Optional parameters omitted
        // No initial options to exercise option creation endpoint
      } satisfies IEconDiscussPoll.ICreate,
    },
  );
  typia.assert(poll);

  // 4) Create an option (success)
  const optionText = `Option ${RandomGenerator.name(1)}`;
  const position1 = 1 as number; // int32
  const created =
    await api.functional.econDiscuss.member.posts.poll.options.create(connA, {
      postId: post.id,
      body: {
        text: optionText,
        position: position1,
      } satisfies IEconDiscussPollOption.ICreate,
    });
  typia.assert(created);
  TestValidator.equals(
    "created option bound to correct poll",
    created.pollId,
    poll.id,
  );
  TestValidator.equals(
    "created option text equals request text",
    created.text,
    optionText,
  );
  TestValidator.equals(
    "created option position equals request position",
    created.position,
    position1,
  );

  // 5) Duplicate text in same poll (different position) → should error
  const position2 = 2 as number; // int32 and different from position1
  await TestValidator.error(
    "duplicate option text within the same poll should fail",
    async () => {
      await api.functional.econDiscuss.member.posts.poll.options.create(connA, {
        postId: post.id,
        body: {
          text: optionText, // duplicate text
          position: position2, // different position
        } satisfies IEconDiscussPollOption.ICreate,
      });
    },
  );

  // 6) Duplicate position in same poll (different text) → should error
  const anotherText = `Another ${RandomGenerator.name(1)}`;
  await TestValidator.error(
    "duplicate option position within the same poll should fail",
    async () => {
      await api.functional.econDiscuss.member.posts.poll.options.create(connA, {
        postId: post.id,
        body: {
          text: anotherText, // different text
          position: position1, // duplicate position
        } satisfies IEconDiscussPollOption.ICreate,
      });
    },
  );

  // 7) Unauthenticated attempt → should error
  await TestValidator.error(
    "unauthenticated option creation should fail",
    async () => {
      await api.functional.econDiscuss.member.posts.poll.options.create(
        unauthConn,
        {
          postId: post.id,
          body: {
            text: `UA ${RandomGenerator.name(1)}`,
            position: 3,
          } satisfies IEconDiscussPollOption.ICreate,
        },
      );
    },
  );

  // 8) Member B joins and attempts to create option on A's poll → should error
  const memberB = await api.functional.auth.member.join(connB, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(1),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(memberB);

  await TestValidator.error(
    "other member cannot create option on someone else's poll",
    async () => {
      await api.functional.econDiscuss.member.posts.poll.options.create(connB, {
        postId: post.id,
        body: {
          text: `B ${RandomGenerator.name(1)}`,
          position: 4,
        } satisfies IEconDiscussPollOption.ICreate,
      });
    },
  );
}
