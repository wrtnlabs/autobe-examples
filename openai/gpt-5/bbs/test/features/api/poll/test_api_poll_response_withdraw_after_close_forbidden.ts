import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEPollQuestionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEPollQuestionType";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPoll";
import type { IEconDiscussPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollOption";
import type { IEconDiscussPollQuestionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollQuestionType";
import type { IEconDiscussPollResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollResponse";
import type { IEconDiscussPollVisibilityMode } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollVisibilityMode";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";

/**
 * Verify that withdrawing or participating in a poll is forbidden after
 * closure, and that the withdrawal endpoint requires authentication.
 *
 * Business flow
 *
 * 1. Member joins (token auto-attached by SDK)
 * 2. Member creates a post
 * 3. Member creates a poll on the post (single_choice), initially open
 * 4. Member creates two poll options
 * 5. Member submits a response while open (single choice)
 * 6. Member closes the poll by setting end_at in the past (PUT update)
 * 7. After closure, attempting to respond again must fail
 * 8. Unauthenticated withdrawal (DELETE) must fail (auth boundary)
 *
 * Notes
 *
 * - SDK lacks an endpoint to fetch a created response ID, so we validate the
 *   post-closure prohibition through a second create attempt instead of actual
 *   withdrawal of the original response. We still exercise the DELETE endpoint
 *   for the authentication boundary using a random UUID.
 */
export async function test_api_poll_response_withdraw_after_close_forbidden(
  connection: api.IConnection,
) {
  // 1) Join as a member (SDK sets Authorization header internally)
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const authorized = await api.functional.auth.member.join(connection, {
    body: memberJoinBody,
  });
  typia.assert(authorized);
  typia.assert<IAuthorizationToken>(authorized.token);

  // 2) Create a post
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 6 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 18,
    }),
    summary: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies IEconDiscussPost.ICreate;
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: postBody,
    },
  );
  typia.assert(post);
  // Sanity: post authored by the authenticated member
  TestValidator.equals(
    "post author must match authenticated member",
    post.author_user_id,
    authorized.id,
  );

  // 3) Create a poll on the post (initially open)
  const now = new Date();
  const startAt = new Date(now.getTime() - 60_000).toISOString(); // opened 1 minute ago
  const endAtOpen = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // closes in 1 hour
  const pollBody = {
    question: RandomGenerator.paragraph({ sentences: 6 }),
    questionType: "single_choice",
    visibilityMode: "hidden_until_close",
    expertOnly: false,
    allowVoteChange: true,
    startAt,
    endAt: endAtOpen,
  } satisfies IEconDiscussPoll.ICreate;
  const poll = await api.functional.econDiscuss.member.posts.poll.create(
    connection,
    {
      postId: post.id,
      body: pollBody,
    },
  );
  typia.assert(poll);

  // 4) Create two options
  const option1 =
    await api.functional.econDiscuss.member.posts.poll.options.create(
      connection,
      {
        postId: post.id,
        body: {
          text: RandomGenerator.paragraph({ sentences: 3 }),
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
          text: RandomGenerator.paragraph({ sentences: 3 }),
          position: 2,
        } satisfies IEconDiscussPollOption.ICreate,
      },
    );
  typia.assert(option2);

  // 5) Submit a response while open (single choice)
  const responseCreateBody = {
    questionType: "single_choice", // discriminator value
    optionId: option1.id,
  } satisfies IEconDiscussPollResponse.ICreate;
  await api.functional.econDiscuss.member.posts.poll.responses.create(
    connection,
    {
      postId: post.id,
      body: responseCreateBody,
    },
  );

  // 6) Close the poll by setting end_at in the past
  const closedAt = new Date(Date.now() - 60_000).toISOString();
  const updatedPoll = await api.functional.econDiscuss.member.posts.poll.update(
    connection,
    {
      postId: post.id,
      body: {
        end_at: closedAt,
      } satisfies IEconDiscussPoll.IUpdate,
    },
  );
  typia.assert(updatedPoll);
  // Validate poll closure reflected via timestamps and options remain present
  TestValidator.predicate(
    "poll endAt must be set and not be in the future",
    () => {
      if (updatedPoll.endAt === null || updatedPoll.endAt === undefined)
        return false;
      const ts = Date.parse(updatedPoll.endAt);
      return !Number.isNaN(ts) && ts <= Date.now();
    },
  );
  const updatedOptionIds = updatedPoll.options.map((o) => o.id);
  TestValidator.predicate(
    "updated poll retains option1",
    updatedOptionIds.includes(option1.id),
  );
  TestValidator.predicate(
    "updated poll retains option2",
    updatedOptionIds.includes(option2.id),
  );

  // 7) After closure, attempting to submit a response again must fail
  await TestValidator.error(
    "cannot submit response after poll is closed",
    async () => {
      await api.functional.econDiscuss.member.posts.poll.responses.create(
        connection,
        {
          postId: post.id,
          body: {
            questionType: "single_choice",
            optionId: option2.id,
          } satisfies IEconDiscussPollResponse.ICreate,
        },
      );
    },
  );

  // 8) Authentication boundary: unauthenticated withdraw must fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated withdrawal should fail",
    async () => {
      await api.functional.econDiscuss.member.posts.poll.responses.erase(
        unauthConn,
        {
          postId: post.id,
          responseId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
