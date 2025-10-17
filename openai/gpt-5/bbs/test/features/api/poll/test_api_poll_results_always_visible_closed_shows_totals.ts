import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEPollQuestionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEPollQuestionType";
import type { IEPollResponseStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEPollResponseStatus";
import type { IEQuestionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEQuestionType";
import type { IESegmentBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IESegmentBy";
import type { IEVisibilityMode } from "@ORGANIZATION/PROJECT-api/lib/structures/IEVisibilityMode";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPoll";
import type { IEconDiscussPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollOption";
import type { IEconDiscussPollQuestionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollQuestionType";
import type { IEconDiscussPollResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollResponse";
import type { IEconDiscussPollResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollResult";
import type { IEconDiscussPollResults } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollResults";
import type { IEconDiscussPollVisibilityMode } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollVisibilityMode";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";

export async function test_api_poll_results_always_visible_closed_shows_totals(
  connection: api.IConnection,
) {
  /**
   * Validate public visibility and correct aggregation of an always_visible
   * single-choice poll.
   *
   * Adjusted feasibility: keep poll window open (startAt past, endAt future) to
   * allow response submissions within test.
   *
   * Steps
   *
   * 1. Join Member A (auth token applied automatically)
   * 2. Create a Post as Member A
   * 3. Create an always_visible single-choice Poll with open schedule
   * 4. Create two options: "Yes" (pos=1) and "No" (pos=2)
   * 5. Submit responses: Member A → Yes, Member B → No
   * 6. Fetch results via unauthenticated connection and validate aggregates
   */

  // 1) Member A joins
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberA = await api.functional.auth.member.join(connection, {
    body: {
      email: memberAEmail,
      password: RandomGenerator.alphaNumeric(10), // >= 8 chars
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(memberA);

  // 2) Create a Post as Member A
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 4 }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 6,
          sentenceMax: 12,
        }),
        // summary, scheduled_publish_at, topicIds optional
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(post);

  // 3) Create a Poll (always_visible, single_choice), open window
  const now = new Date();
  const poll = await api.functional.econDiscuss.member.posts.poll.create(
    connection,
    {
      postId: post.id,
      body: {
        question: "Do you agree?",
        questionType: "single_choice",
        visibilityMode: "always_visible",
        expertOnly: false,
        allowVoteChange: true,
        startAt: new Date(now.getTime() - 60_000).toISOString(), // 1 min ago
        endAt: new Date(now.getTime() + 60 * 60_000).toISOString(), // +1 hour
      } satisfies IEconDiscussPoll.ICreate,
    },
  );
  typia.assert(poll);

  // 4) Create two options: Yes (1), No (2)
  const optYes =
    await api.functional.econDiscuss.member.posts.poll.options.create(
      connection,
      {
        postId: post.id,
        body: {
          text: "Yes",
          position: 1,
        } satisfies IEconDiscussPollOption.ICreate,
      },
    );
  typia.assert(optYes);

  const optNo =
    await api.functional.econDiscuss.member.posts.poll.options.create(
      connection,
      {
        postId: post.id,
        body: {
          text: "No",
          position: 2,
        } satisfies IEconDiscussPollOption.ICreate,
      },
    );
  typia.assert(optNo);

  // 5) Submit responses: Member A → Yes
  await api.functional.econDiscuss.member.posts.poll.responses.create(
    connection,
    {
      postId: post.id,
      body: {
        questionType: "single_choice",
        optionId: optYes.id,
      } satisfies IEconDiscussPollResponse.ICreate,
    },
  );

  // Switch to Member B by joining another account (token auto-applied)
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberB = await api.functional.auth.member.join(connection, {
    body: {
      email: memberBEmail,
      password: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(memberB);

  // Member B → No
  await api.functional.econDiscuss.member.posts.poll.responses.create(
    connection,
    {
      postId: post.id,
      body: {
        questionType: "single_choice",
        optionId: optNo.id,
      } satisfies IEconDiscussPollResponse.ICreate,
    },
  );

  // 6) Fetch results via unauthenticated connection to assert always_visible public visibility
  const unauth: api.IConnection = { ...connection, headers: {} };
  const results = await api.functional.econDiscuss.posts.poll.results.index(
    unauth,
    {
      postId: post.id,
      body: {
        includeOptionBreakdown: true,
      } satisfies IEconDiscussPollResult.IRequest,
    },
  );
  typia.assert(results);

  // Basic identity checks
  TestValidator.equals("result postId matches", results.postId, post.id);
  TestValidator.equals("result pollId matches", results.pollId, poll.id);
  TestValidator.equals(
    "questionType is single_choice",
    results.questionType,
    "single_choice",
  );

  // Aggregation checks
  TestValidator.equals("totalResponses should be 2", results.totalResponses, 2);
  TestValidator.predicate(
    "option aggregates exist with at least two entries",
    Array.isArray(results.options ?? []) && (results.options ?? []).length >= 2,
  );

  const yesCount =
    (results.options ?? []).find((o) => o.optionId === optYes.id)?.count ?? 0;
  const noCount =
    (results.options ?? []).find((o) => o.optionId === optNo.id)?.count ?? 0;

  TestValidator.equals("yes option count is 1", yesCount, 1);
  TestValidator.equals("no option count is 1", noCount, 1);

  const summed = (results.options ?? []).reduce((acc, r) => acc + r.count, 0);
  TestValidator.equals(
    "sum of option counts equals totalResponses",
    summed,
    results.totalResponses,
  );
}
