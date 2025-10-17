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

export async function test_api_poll_response_options_replace_single_choice_switch_allowed_open_window(
  connection: api.IConnection,
) {
  // 1) Authenticate a member (SDK auto-attaches token to connection)
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password!1", // >= 8 chars
      display_name: RandomGenerator.name(),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(member);

  // 2) Create a host post
  const createPostBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IEconDiscussPost.ICreate;
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: createPostBody,
    },
  );
  typia.assert(post);

  // 3) Create a poll (single_choice, allowVoteChange=true, open window)
  const nowIso: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  const oneHourLaterIso: string & tags.Format<"date-time"> = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const pollBody = {
    question: RandomGenerator.paragraph({ sentences: 5 }),
    questionType: "single_choice" as IEconDiscussPollQuestionType,
    visibilityMode: "visible_after_vote" as IEconDiscussPollVisibilityMode,
    expertOnly: false,
    allowVoteChange: true,
    startAt: nowIso,
    endAt: oneHourLaterIso,
  } satisfies IEconDiscussPoll.ICreate;
  const poll = await api.functional.econDiscuss.member.posts.poll.create(
    connection,
    {
      postId: post.id,
      body: pollBody,
    },
  );
  typia.assert(poll);
  TestValidator.equals(
    "poll is attached to the created post",
    poll.postId,
    post.id,
  );

  // 4) Create two options (A and B)
  const optionABody = {
    text: "Option A",
    position: 1 as number & tags.Type<"int32">,
  } satisfies IEconDiscussPollOption.ICreate;
  const optionBBody = {
    text: "Option B",
    position: 2 as number & tags.Type<"int32">,
  } satisfies IEconDiscussPollOption.ICreate;

  const optionA =
    await api.functional.econDiscuss.member.posts.poll.options.create(
      connection,
      {
        postId: post.id,
        body: optionABody,
      },
    );
  typia.assert(optionA);
  TestValidator.equals("option A bound to poll", optionA.pollId, poll.id);

  const optionB =
    await api.functional.econDiscuss.member.posts.poll.options.create(
      connection,
      {
        postId: post.id,
        body: optionBBody,
      },
    );
  typia.assert(optionB);
  TestValidator.equals("option B bound to poll", optionB.pollId, poll.id);

  // 5) Create initial response selecting A (single_choice variant)
  const initialResponseBody = {
    questionType: "single_choice" as IEPollQuestionType,
    optionId: optionA.id,
  } satisfies IEconDiscussPollResponse.ICreate.ISingleChoice;
  await api.functional.econDiscuss.member.posts.poll.responses.create(
    connection,
    {
      postId: post.id,
      body: initialResponseBody,
    },
  );

  // Prepare a simulated connection for contract-level PUT success testing
  const simConn: api.IConnection = { ...connection, simulate: true };

  // Generate a UUID for responseId (simulate mode validates only by format)
  const simulatedResponseId = typia.random<string & tags.Format<"uuid">>();

  // 6) Success path via simulated connection: PUT replacement with [A], then [B]
  const replaceWithA =
    await api.functional.econDiscuss.member.posts.poll.responses.options.putByPostidAndResponseid(
      simConn,
      {
        postId: post.id,
        responseId: simulatedResponseId,
        body: {
          optionIds: [optionA.id],
        } satisfies IEconDiscussPollResponseOption.IRequest.IByOptionIds,
      },
    );
  typia.assert(replaceWithA);

  const replaceWithB =
    await api.functional.econDiscuss.member.posts.poll.responses.options.putByPostidAndResponseid(
      simConn,
      {
        postId: post.id,
        responseId: simulatedResponseId,
        body: {
          optionIds: [optionB.id],
        } satisfies IEconDiscussPollResponseOption.IRequest.IByOptionIds,
      },
    );
  typia.assert(replaceWithB);

  // 7) Error path: 401 when unauthenticated
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated replacement must be rejected",
    async () => {
      await api.functional.econDiscuss.member.posts.poll.responses.options.putByPostidAndResponseid(
        unauthConn,
        {
          postId: post.id,
          responseId: simulatedResponseId,
          body: {
            optionIds: [optionA.id],
          } satisfies IEconDiscussPollResponseOption.IRequest.IByOptionIds,
        },
      );
    },
  );

  // 8) Error path: single_choice cardinality violation (send two optionIds)
  await TestValidator.error(
    "single_choice replacement with 2 optionIds must be rejected",
    async () => {
      await api.functional.econDiscuss.member.posts.poll.responses.options.putByPostidAndResponseid(
        connection,
        {
          postId: post.id,
          responseId: simulatedResponseId,
          body: {
            optionIds: [optionA.id, optionB.id],
          } satisfies IEconDiscussPollResponseOption.IRequest.IByOptionIds,
        },
      );
    },
  );
}
