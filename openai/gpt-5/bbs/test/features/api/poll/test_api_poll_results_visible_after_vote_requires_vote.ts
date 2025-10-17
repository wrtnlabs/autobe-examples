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

/**
 * Validate visible_after_vote poll results gating and post-vote visibility.
 *
 * Steps:
 *
 * 1. Join as a new member (authorized session).
 * 2. Create a post to host the poll.
 * 3. Create a single_choice poll with visibility_mode=visible_after_vote, open
 *    window (startAt<present<endAt).
 * 4. Create two options ("A", "B").
 * 5. Attempt to fetch results before voting -> expect error (gating).
 * 6. Submit a single-choice vote selecting option "A".
 * 7. Fetch results -> expect aggregates to reflect A=1, B=0, totalResponses>=1,
 *    and percent sums ~100.
 * 8. Fetch again to confirm idempotency (stable aggregates without state change).
 */
export async function test_api_poll_results_visible_after_vote_requires_vote(
  connection: api.IConnection,
) {
  // 1) Join as a new member (authorized session)
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const displayName: string = RandomGenerator.name(2);
  const password: string = RandomGenerator.alphaNumeric(12);
  const authorized = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
      display_name: displayName,
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(authorized);

  // 2) Create a post to host the poll
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        summary: RandomGenerator.paragraph({ sentences: 8 }),
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(post);

  // 3) Create a poll (single_choice, visible_after_vote, open window)
  const now = Date.now();
  const startAt = new Date(now - 60_000).toISOString(); // 1 minute in the past
  const endAt = new Date(now + 3_600_000).toISOString(); // 1 hour in the future

  const poll = await api.functional.econDiscuss.member.posts.poll.create(
    connection,
    {
      postId: post.id,
      body: {
        question: RandomGenerator.paragraph({ sentences: 6 }),
        questionType: "single_choice",
        visibilityMode: "visible_after_vote",
        expertOnly: false,
        allowVoteChange: true,
        startAt,
        endAt,
      } satisfies IEconDiscussPoll.ICreate,
    },
  );
  typia.assert(poll);

  // 4) Create two options: "A" and "B"
  const optionA =
    await api.functional.econDiscuss.member.posts.poll.options.create(
      connection,
      {
        postId: post.id,
        body: {
          text: "A",
          position: 1,
        } satisfies IEconDiscussPollOption.ICreate,
      },
    );
  typia.assert(optionA);

  const optionB =
    await api.functional.econDiscuss.member.posts.poll.options.create(
      connection,
      {
        postId: post.id,
        body: {
          text: "B",
          position: 2,
        } satisfies IEconDiscussPollOption.ICreate,
      },
    );
  typia.assert(optionB);

  // 5) Pre-vote: results should not be visible (gating enforced)
  await TestValidator.error(
    "pre-vote: results request must be denied by visibility gate",
    async () => {
      await api.functional.econDiscuss.posts.poll.results.index(connection, {
        postId: post.id,
        body: {
          includeOptionBreakdown: true,
        } satisfies IEconDiscussPollResult.IRequest,
      });
    },
  );

  // 6) Submit single-choice vote selecting option "A"
  await api.functional.econDiscuss.member.posts.poll.responses.create(
    connection,
    {
      postId: post.id,
      body: {
        questionType: "single_choice",
        optionId: optionA.id,
      } satisfies IEconDiscussPollResponse.ICreate.ISingleChoice,
    },
  );

  // 7) Fetch results after voting → expect success and correct aggregates
  const results1 = await api.functional.econDiscuss.posts.poll.results.index(
    connection,
    {
      postId: post.id,
      body: {
        includeOptionBreakdown: true,
      } satisfies IEconDiscussPollResult.IRequest,
    },
  );
  typia.assert(results1);

  // Ensure options aggregate exists for single_choice
  const optionsAgg1 = typia.assert<IEconDiscussPollResults.IOption[]>(
    results1.options!,
  );

  // totalResponses >= 1
  TestValidator.predicate(
    "post-vote: totalResponses should be >= 1",
    results1.totalResponses >= 1,
  );

  // Find counts for A and B
  const a1 = optionsAgg1.find((o) => o.optionId === optionA.id);
  const b1 = optionsAgg1.find((o) => o.optionId === optionB.id);
  typia.assert(a1!);
  typia.assert(b1!);

  TestValidator.equals("option A count should be 1", a1!.count, 1);
  TestValidator.equals("option B count should be 0", b1!.count, 0);

  // Percentages should sum approximately to 100 (allowing tiny epsilon)
  const percentSum1 = optionsAgg1.reduce((acc, cur) => acc + cur.percent, 0);
  TestValidator.predicate(
    "percent sum should be approximately 100",
    Math.abs(percentSum1 - 100) < 1e-6,
  );

  // 8) Idempotency: calling results again without state change returns same aggregates
  const results2 = await api.functional.econDiscuss.posts.poll.results.index(
    connection,
    {
      postId: post.id,
      body: {
        includeOptionBreakdown: true,
      } satisfies IEconDiscussPollResult.IRequest,
    },
  );
  typia.assert(results2);
  const optionsAgg2 = typia.assert<IEconDiscussPollResults.IOption[]>(
    results2.options!,
  );

  TestValidator.equals(
    "idempotency: totalResponses stable",
    results2.totalResponses,
    results1.totalResponses,
  );

  const a2 = optionsAgg2.find((o) => o.optionId === optionA.id);
  const b2 = optionsAgg2.find((o) => o.optionId === optionB.id);
  typia.assert(a2!);
  typia.assert(b2!);

  TestValidator.equals(
    "idempotency: option A count stable",
    a2!.count,
    a1!.count,
  );
  TestValidator.equals(
    "idempotency: option B count stable",
    b2!.count,
    b1!.count,
  );
}
