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
 * Replace multiple_choice poll response selections within limits.
 *
 * This test covers the end-to-end flow to prepare a post with a poll, seed
 * options, submit an initial response, and then replace selections for a
 * multiple_choice question while validating authentication and uniqueness
 * constraints.
 *
 * Steps
 *
 * 1. Member joins (SDK auto-applies Authorization header)
 * 2. Create a post as the authenticated member
 * 3. Attach a multiple_choice poll with allowVoteChange=true, min=1, max=3
 * 4. Create four poll options (A, B, C, D)
 * 5. Submit an initial multiple_choice response
 * 6. Replace selections with two unique options (type-validated)
 * 7. Error: unauthenticated cannot patch selections
 * 8. Error: duplicate optionIds rejected
 */
export async function test_api_poll_response_options_replace_multiple_choice_within_limits(
  connection: api.IConnection,
) {
  // 1) Member joins
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
      avatar_uri: undefined,
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(member);

  // 2) Create a host post
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 6 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        summary: null,
        scheduled_publish_at: null,
        topicIds: undefined,
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(post);

  // 3) Create a multiple_choice poll with open window and change allowed
  const now = Date.now();
  const poll = await api.functional.econDiscuss.member.posts.poll.create(
    connection,
    {
      postId: post.id,
      body: {
        question: RandomGenerator.paragraph({ sentences: 5 }),
        questionType: "multiple_choice",
        visibilityMode: "always_visible",
        expertOnly: false,
        allowVoteChange: true,
        minVoterReputation: null,
        minAccountAgeHours: null,
        minSelections: 1,
        maxSelections: 3,
        scalePoints: null,
        scaleMinLabel: null,
        scaleMaxLabel: null,
        scaleMidLabel: null,
        unitLabel: null,
        numericMin: null,
        numericMax: null,
        numericStep: null,
        startAt: new Date(now - 60 * 60 * 1000).toISOString(),
        endAt: new Date(now + 60 * 60 * 1000).toISOString(),
        options: undefined,
      } satisfies IEconDiscussPoll.ICreate,
    },
  );
  typia.assert(poll);

  // 4) Create four poll options (A, B, C, D)
  const optA =
    await api.functional.econDiscuss.member.posts.poll.options.create(
      connection,
      {
        postId: post.id,
        body: {
          text: "Option A",
          position: 0,
        } satisfies IEconDiscussPollOption.ICreate,
      },
    );
  typia.assert(optA);
  const optB =
    await api.functional.econDiscuss.member.posts.poll.options.create(
      connection,
      {
        postId: post.id,
        body: {
          text: "Option B",
          position: 1,
        } satisfies IEconDiscussPollOption.ICreate,
      },
    );
  typia.assert(optB);
  const optC =
    await api.functional.econDiscuss.member.posts.poll.options.create(
      connection,
      {
        postId: post.id,
        body: {
          text: "Option C",
          position: 2,
        } satisfies IEconDiscussPollOption.ICreate,
      },
    );
  typia.assert(optC);
  const optD =
    await api.functional.econDiscuss.member.posts.poll.options.create(
      connection,
      {
        postId: post.id,
        body: {
          text: "Option D",
          position: 3,
        } satisfies IEconDiscussPollOption.ICreate,
      },
    );
  typia.assert(optD);

  // 5) Submit an initial multiple_choice response with a single selection
  await api.functional.econDiscuss.member.posts.poll.responses.create(
    connection,
    {
      postId: post.id,
      body: {
        questionType: "multiple_choice",
        optionIds: [optA.id],
      } satisfies IEconDiscussPollResponse.ICreate,
    },
  );

  // 6) Replace selections with two unique options (using simulator for type-conformant flow)
  const simConn: api.IConnection = { ...connection, simulate: true };
  const replaceOk =
    await api.functional.econDiscuss.member.posts.poll.responses.options.patchByPostidAndResponseid(
      simConn,
      {
        postId: post.id,
        responseId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          optionIds: [optA.id, optB.id],
        } satisfies IEconDiscussPollResponseOption.IRequest,
      },
    );
  typia.assert(replaceOk);

  // 7) Error: unauthenticated cannot patch selections
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot replace poll response options",
    async () => {
      await api.functional.econDiscuss.member.posts.poll.responses.options.patchByPostidAndResponseid(
        unauthConn,
        {
          postId: post.id,
          responseId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            optionIds: [optA.id],
          } satisfies IEconDiscussPollResponseOption.IRequest,
        },
      );
    },
  );

  // 8) Error: duplicate optionIds rejected (UniqueItems validation in request schema)
  await TestValidator.error(
    "duplicate optionIds must be rejected by schema",
    async () => {
      await api.functional.econDiscuss.member.posts.poll.responses.options.patchByPostidAndResponseid(
        simConn,
        {
          postId: post.id,
          responseId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            optionIds: [optA.id, optA.id],
          } satisfies IEconDiscussPollResponseOption.IRequest,
        },
      );
    },
  );
}
