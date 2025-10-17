import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEPollQuestionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEPollQuestionType";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussModerator";
import type { IEconDiscussPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPoll";
import type { IEconDiscussPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollOption";
import type { IEconDiscussPollQuestionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollQuestionType";
import type { IEconDiscussPollResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollResponse";
import type { IEconDiscussPollVisibilityMode } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollVisibilityMode";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";

/**
 * Verify moderator-only removal of poll options and guardrails once responses
 * exist.
 *
 * Steps
 *
 * 1. Member A joins and creates Post-1
 * 2. Member A creates Poll-1 (single_choice) and two options (Option-A1,
 *    Option-A2)
 * 3. Member A creates Post-2 with Poll-2 and Option-B1 for mismatched ID tests
 * 4. Negative (auth boundary): As member, attempt moderator DELETE on Option-A1 →
 *    expect error
 * 5. Member A submits a response selecting Option-A2 on Poll-1
 * 6. Moderator joins
 * 7. Guardrail: Attempt moderator DELETE on Option-A2 (has responses) → expect
 *    error
 * 8. Happy path: Moderator DELETE Option-A1 → success; DELETE again → expect error
 * 9. Negative (mismatched IDs): Moderator tries deleting Option-B1 using postId of
 *    Post-1 → expect error
 *
 * Validations
 *
 * - Typia.assert on all non-void responses
 * - Linkage checks using TestValidator.equals in actual-first order
 * - Error assertions via TestValidator.error with async callbacks
 */
export async function test_api_poll_option_moderator_removal_with_response_guardrails(
  connection: api.IConnection,
) {
  // 1) Member A joins to author content
  const memberEmailA: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberA: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmailA,
        password: "Passw0rd!",
        display_name: RandomGenerator.name(),
        timezone: "Asia/Seoul",
        locale: "en-US",
      } satisfies IEconDiscussMember.ICreate,
    });
  typia.assert(memberA);

  // 2) Member A creates Post-1
  const post1: IEconDiscussPost =
    await api.functional.econDiscuss.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 4 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IEconDiscussPost.ICreate,
    });
  typia.assert(post1);

  // Attach Poll-1 (single_choice)
  const poll1: IEconDiscussPoll =
    await api.functional.econDiscuss.member.posts.poll.create(connection, {
      postId: post1.id,
      body: {
        question: RandomGenerator.paragraph({ sentences: 6 }),
        questionType: "single_choice",
        visibilityMode: "visible_after_vote",
        expertOnly: false,
        allowVoteChange: true,
      } satisfies IEconDiscussPoll.ICreate,
    });
  typia.assert(poll1);
  TestValidator.equals("poll1 is linked to post1", poll1.postId, post1.id);

  // Create two options for Poll-1
  const optionA1: IEconDiscussPollOption =
    await api.functional.econDiscuss.member.posts.poll.options.create(
      connection,
      {
        postId: post1.id,
        body: {
          text: "Option A1",
          position: 0,
        } satisfies IEconDiscussPollOption.ICreate,
      },
    );
  typia.assert(optionA1);
  TestValidator.equals("optionA1 belongs to poll1", optionA1.pollId, poll1.id);

  const optionA2: IEconDiscussPollOption =
    await api.functional.econDiscuss.member.posts.poll.options.create(
      connection,
      {
        postId: post1.id,
        body: {
          text: "Option A2",
          position: 1,
        } satisfies IEconDiscussPollOption.ICreate,
      },
    );
  typia.assert(optionA2);
  TestValidator.equals("optionA2 belongs to poll1", optionA2.pollId, poll1.id);

  // 3) Member A creates Post-2 with Poll-2 and Option-B1 for mismatched tests
  const post2: IEconDiscussPost =
    await api.functional.econDiscuss.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IEconDiscussPost.ICreate,
    });
  typia.assert(post2);

  const poll2: IEconDiscussPoll =
    await api.functional.econDiscuss.member.posts.poll.create(connection, {
      postId: post2.id,
      body: {
        question: RandomGenerator.paragraph({ sentences: 5 }),
        questionType: "single_choice",
        visibilityMode: "visible_after_vote",
        expertOnly: false,
        allowVoteChange: true,
      } satisfies IEconDiscussPoll.ICreate,
    });
  typia.assert(poll2);
  TestValidator.equals("poll2 is linked to post2", poll2.postId, post2.id);

  const optionB1: IEconDiscussPollOption =
    await api.functional.econDiscuss.member.posts.poll.options.create(
      connection,
      {
        postId: post2.id,
        body: {
          text: "Option B1",
          position: 0,
        } satisfies IEconDiscussPollOption.ICreate,
      },
    );
  typia.assert(optionB1);
  TestValidator.equals("optionB1 belongs to poll2", optionB1.pollId, poll2.id);

  // 4) Negative (auth boundary): Member attempts moderator DELETE → expect error
  await TestValidator.error(
    "member cannot delete poll option via moderator endpoint",
    async () => {
      await api.functional.econDiscuss.moderator.posts.poll.options.erase(
        connection,
        {
          postId: post1.id,
          optionId: optionA1.id,
        },
      );
    },
  );

  // 5) Member A submits single_choice response selecting Option-A2
  await api.functional.econDiscuss.member.posts.poll.responses.create(
    connection,
    {
      postId: post1.id,
      body: {
        questionType: "single_choice",
        optionId: optionA2.id,
      } satisfies IEconDiscussPollResponse.ICreate,
    },
  );

  // 6) Moderator joins
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const moderator: IEconDiscussModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "Passw0rd!",
        display_name: RandomGenerator.name(),
        timezone: "Asia/Seoul",
        locale: "en-US",
      } satisfies IEconDiscussModerator.ICreate,
    });
  typia.assert(moderator);

  // 7) Guardrail: attempt to delete option with responses → expect error
  await TestValidator.error(
    "moderator cannot delete an option that already has responses",
    async () => {
      await api.functional.econDiscuss.moderator.posts.poll.options.erase(
        connection,
        {
          postId: post1.id,
          optionId: optionA2.id,
        },
      );
    },
  );

  // 8) Happy path: delete Option-A1, then verify subsequent delete errors
  await api.functional.econDiscuss.moderator.posts.poll.options.erase(
    connection,
    {
      postId: post1.id,
      optionId: optionA1.id,
    },
  );

  await TestValidator.error(
    "deleting an already-removed option should fail",
    async () => {
      await api.functional.econDiscuss.moderator.posts.poll.options.erase(
        connection,
        {
          postId: post1.id,
          optionId: optionA1.id,
        },
      );
    },
  );

  // 9) Negative (mismatched IDs): using post1 with optionB1 (belongs to post2) → expect error
  await TestValidator.error(
    "mismatched postId/optionId should be rejected",
    async () => {
      await api.functional.econDiscuss.moderator.posts.poll.options.erase(
        connection,
        {
          postId: post1.id,
          optionId: optionB1.id,
        },
      );
    },
  );
}
