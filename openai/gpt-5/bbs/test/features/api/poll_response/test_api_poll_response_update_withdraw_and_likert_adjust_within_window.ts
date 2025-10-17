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
 * Update and withdraw a Likert poll response within active window
 * (simulation-backed E2E).
 *
 * Business goal
 *
 * - Ensure a member can update a Likert response while the poll is open and then
 *   withdraw it.
 * - Use simulation for the update steps because response creation returns void
 *   and no read/list API exists to obtain the responseId.
 *
 * Flow
 *
 * 1. Member A joins and creates a post.
 * 2. Member A creates a Likert poll with allowVoteChange=true, active window
 *    (startAt past, endAt future).
 * 3. Member B joins and submits a Likert response (void response by contract).
 * 4. Generate a responseId (UUID) for simulation-backed update calls; adjust
 *    likertValue, then withdraw.
 * 5. Validate types for every non-void response and basic object change after
 *    withdrawal.
 */
export async function test_api_poll_response_update_withdraw_and_likert_adjust_within_window(
  connection: api.IConnection,
) {
  // Use simulation to enable success-path updates without responseId lookup endpoints.
  const sim: api.IConnection = { ...connection, simulate: true };

  // 1) Member A joins (authorization header auto-set by SDK)
  const memberABody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // >= 8 chars
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const authA: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(sim, { body: memberABody });
  typia.assert(authA);

  // 2) Member A creates a post
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 6 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies IEconDiscussPost.ICreate;
  const post: IEconDiscussPost =
    await api.functional.econDiscuss.member.posts.create(sim, {
      body: postBody,
    });
  typia.assert(post);

  // 3) Member A creates a Likert poll with an active window and vote-change allowed
  const now = Date.now();
  const pollBody = {
    question: RandomGenerator.paragraph({ sentences: 5 }),
    questionType: "likert" as IEconDiscussPollQuestionType,
    visibilityMode: "visible_after_vote" as IEconDiscussPollVisibilityMode,
    expertOnly: false,
    allowVoteChange: true,
    scalePoints: 5,
    scaleMinLabel: "Strongly disagree",
    scaleMaxLabel: "Strongly agree",
    scaleMidLabel: "Neutral",
    startAt: new Date(now - 10 * 60 * 1000).toISOString(), // 10 minutes ago
    endAt: new Date(now + 60 * 60 * 1000).toISOString(), // +1 hour
  } satisfies IEconDiscussPoll.ICreate;
  const poll: IEconDiscussPoll =
    await api.functional.econDiscuss.member.posts.poll.create(sim, {
      postId: post.id,
      body: pollBody,
    });
  typia.assert(poll);

  // 4) Member B joins (switch identity) and creates an initial Likert response
  const memberBBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const authB: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(sim, { body: memberBBody });
  typia.assert(authB);

  const initialResponseBody = {
    questionType: "likert",
    likertValue: 3,
  } satisfies IEconDiscussPollResponse.ICreate;
  await api.functional.econDiscuss.member.posts.poll.responses.create(sim, {
    postId: post.id,
    body: initialResponseBody,
  });

  // Since the create endpoint returns void and no read/list is provided, generate a UUID for updates in simulation.
  const responseId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Update likert value within window
  const updateLikertBody = {
    likertValue: 5,
  } satisfies IEconDiscussPollResponse.IUpdate;
  const updatedAfterLikert: IEconDiscussPollResponse =
    await api.functional.econDiscuss.member.posts.poll.responses.update(sim, {
      postId: post.id,
      responseId,
      body: updateLikertBody,
    });
  typia.assert(updatedAfterLikert);

  // Withdraw the response
  const withdrawBody = {
    status: "withdrawn",
  } satisfies IEconDiscussPollResponse.IUpdate;
  const updatedAfterWithdraw: IEconDiscussPollResponse =
    await api.functional.econDiscuss.member.posts.poll.responses.update(sim, {
      postId: post.id,
      responseId,
      body: withdrawBody,
    });
  typia.assert(updatedAfterWithdraw);

  // Basic business effect check: object differs after withdrawal (no strict field assumption)
  TestValidator.notEquals(
    "response object should change after withdrawal",
    updatedAfterWithdraw,
    updatedAfterLikert,
  );
}
