import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEPollQuestionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEPollQuestionType";
import type { IEQuestionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEQuestionType";
import type { IEVisibilityMode } from "@ORGANIZATION/PROJECT-api/lib/structures/IEVisibilityMode";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPoll";
import type { IEconDiscussPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollOption";
import type { IEconDiscussPollQuestionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollQuestionType";
import type { IEconDiscussPollResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollResponse";
import type { IEconDiscussPollResults } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollResults";
import type { IEconDiscussPollVisibilityMode } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollVisibilityMode";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";

export async function test_api_poll_results_visibility_modes(
  connection: api.IConnection,
) {
  // Prepare an unauthenticated connection for public access checks
  const anon: api.IConnection = { ...connection, headers: {} };

  // Member A joins (sets Authorization automatically)
  const memberA = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123",
      display_name: RandomGenerator.name(1),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(memberA);

  // -------------------------------------------------------------------------
  // A) hidden_until_close: results must be denied before endAt
  // -------------------------------------------------------------------------
  const postHidden = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(postHidden);

  const hiddenPoll = await api.functional.econDiscuss.member.posts.poll.create(
    connection,
    {
      postId: postHidden.id,
      body: {
        question: RandomGenerator.paragraph({ sentences: 5 }),
        questionType: "single_choice",
        visibilityMode: "hidden_until_close",
        expertOnly: false,
        allowVoteChange: true,
        startAt: new Date().toISOString(),
        endAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // +1 hour
        options: [
          {
            text: "Option A",
            position: 1,
          } satisfies IEconDiscussPollOption.ICreate,
          {
            text: "Option B",
            position: 2,
          } satisfies IEconDiscussPollOption.ICreate,
        ],
      } satisfies IEconDiscussPoll.ICreate,
    },
  );
  typia.assert(hiddenPoll);

  // Submit at least one response (Member A)
  await api.functional.econDiscuss.member.posts.poll.responses.create(
    connection,
    {
      postId: postHidden.id,
      body: {
        questionType: "single_choice",
        optionId: hiddenPoll.options[0].id,
      } satisfies IEconDiscussPollResponse.ICreate,
    },
  );

  // Expect denial before endAt (no status code assertion)
  await TestValidator.error(
    "hidden_until_close: results should be denied before endAt",
    async () =>
      await api.functional.econDiscuss.posts.poll.results.at(anon, {
        postId: postHidden.id,
      }),
  );

  // -------------------------------------------------------------------------
  // B) visible_after_vote: deny for non-voters; allow for voters
  // -------------------------------------------------------------------------
  const postVav = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(postVav);

  const vavPoll = await api.functional.econDiscuss.member.posts.poll.create(
    connection,
    {
      postId: postVav.id,
      body: {
        question: RandomGenerator.paragraph({ sentences: 5 }),
        questionType: "single_choice",
        visibilityMode: "visible_after_vote",
        expertOnly: false,
        allowVoteChange: true,
        options: [
          {
            text: "Choice 1",
            position: 1,
          } satisfies IEconDiscussPollOption.ICreate,
          {
            text: "Choice 2",
            position: 2,
          } satisfies IEconDiscussPollOption.ICreate,
        ],
      } satisfies IEconDiscussPoll.ICreate,
    },
  );
  typia.assert(vavPoll);

  // Deny results before voting (unauthenticated)
  await TestValidator.error(
    "visible_after_vote: non-voter should be denied (unauthenticated)",
    async () =>
      await api.functional.econDiscuss.posts.poll.results.at(anon, {
        postId: postVav.id,
      }),
  );

  // Submit a response as Member A
  await api.functional.econDiscuss.member.posts.poll.responses.create(
    connection,
    {
      postId: postVav.id,
      body: {
        questionType: "single_choice",
        optionId: vavPoll.options[0].id,
      } satisfies IEconDiscussPollResponse.ICreate,
    },
  );

  // Now voter can view results
  const vavResults = await api.functional.econDiscuss.posts.poll.results.at(
    connection,
    { postId: postVav.id },
  );
  typia.assert(vavResults);

  TestValidator.equals(
    "visible_after_vote: postId matches",
    vavResults.postId,
    postVav.id,
  );

  const vavOptionsAgg = vavResults.options ?? [];
  const vavSum = vavOptionsAgg.reduce((acc, row) => acc + row.count, 0);
  TestValidator.equals(
    "visible_after_vote: sum(option.count) equals totalResponses",
    vavSum,
    vavResults.totalResponses,
  );
  const vavSelected = vavOptionsAgg.find(
    (o) => o.optionId === vavPoll.options[0].id,
  );
  TestValidator.predicate(
    "visible_after_vote: selected option appears with count >= 1",
    !!vavSelected && vavSelected.count >= 1,
  );

  // -------------------------------------------------------------------------
  // C) always_visible: public results; verify counts with two voters (A & B)
  // -------------------------------------------------------------------------
  const postAlways = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(postAlways);

  const alwaysPoll = await api.functional.econDiscuss.member.posts.poll.create(
    connection,
    {
      postId: postAlways.id,
      body: {
        question: RandomGenerator.paragraph({ sentences: 5 }),
        questionType: "single_choice",
        visibilityMode: "always_visible",
        expertOnly: false,
        allowVoteChange: true,
        options: [
          {
            text: "Alpha",
            position: 1,
          } satisfies IEconDiscussPollOption.ICreate,
          {
            text: "Beta",
            position: 2,
          } satisfies IEconDiscussPollOption.ICreate,
        ],
      } satisfies IEconDiscussPoll.ICreate,
    },
  );
  typia.assert(alwaysPoll);

  // Member A votes for option[0]
  await api.functional.econDiscuss.member.posts.poll.responses.create(
    connection,
    {
      postId: postAlways.id,
      body: {
        questionType: "single_choice",
        optionId: alwaysPoll.options[0].id,
      } satisfies IEconDiscussPollResponse.ICreate,
    },
  );

  // Switch to Member B by joining (sets new Authorization)
  const memberB = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123",
      display_name: RandomGenerator.name(1),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(memberB);

  // Member B votes for option[1]
  await api.functional.econDiscuss.member.posts.poll.responses.create(
    connection,
    {
      postId: postAlways.id,
      body: {
        questionType: "single_choice",
        optionId: alwaysPoll.options[1].id,
      } satisfies IEconDiscussPollResponse.ICreate,
    },
  );

  // Publicly visible results (unauthenticated)
  const alwaysResults = await api.functional.econDiscuss.posts.poll.results.at(
    anon,
    { postId: postAlways.id },
  );
  typia.assert(alwaysResults);

  TestValidator.equals(
    "always_visible: totalResponses equals number of submitted responses",
    alwaysResults.totalResponses,
    2,
  );
  const alwaysOptionsAgg = alwaysResults.options ?? [];
  const alwaysSum = alwaysOptionsAgg.reduce((acc, row) => acc + row.count, 0);
  TestValidator.equals(
    "always_visible: sum(option.count) equals totalResponses",
    alwaysSum,
    alwaysResults.totalResponses,
  );
  const aRow = alwaysOptionsAgg.find(
    (o) => o.optionId === alwaysPoll.options[0].id,
  );
  const bRow = alwaysOptionsAgg.find(
    (o) => o.optionId === alwaysPoll.options[1].id,
  );
  TestValidator.predicate(
    "always_visible: both selected options appear with count >= 1",
    !!aRow && aRow.count >= 1 && !!bRow && bRow.count >= 1,
  );

  // -------------------------------------------------------------------------
  // D) 404 case: no poll attached → results should error
  // -------------------------------------------------------------------------
  const postNoPoll = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(postNoPoll);

  await TestValidator.error(
    "no poll: requesting results should error",
    async () =>
      await api.functional.econDiscuss.posts.poll.results.at(connection, {
        postId: postNoPoll.id,
      }),
  );
}
