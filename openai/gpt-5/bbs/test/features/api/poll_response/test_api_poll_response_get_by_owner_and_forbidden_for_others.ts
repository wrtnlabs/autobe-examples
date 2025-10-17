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
 * Validate access control for reading a poll response.
 *
 * This test builds a realistic flow:
 *
 * 1. Member A joins, creates a post, and attaches an active Likert poll
 * 2. Member B joins and submits a Likert response
 * 3. Access control validations on GET
 *    /econDiscuss/member/posts/{postId}/poll/responses/{responseId}
 *
 *    - Unauthenticated access should error
 *    - Other member (Member C) should error when attempting to read a response
 *    - Mismatched post context should error
 *
 * Notes:
 *
 * - The response creation API returns void and no list endpoint is available.
 *   Therefore, we cannot obtain the actual responseId for a success read. This
 *   test focuses on guard paths only (without asserting specific HTTP codes).
 */
export async function test_api_poll_response_get_by_owner_and_forbidden_for_others(
  connection: api.IConnection,
) {
  // 1) Member A (author) joins and becomes the authenticated actor
  const memberA = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(memberA);

  // 2) Member A creates a post
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(post);

  // 3) Member A attaches an active Likert poll
  const now = Date.now();
  const poll = await api.functional.econDiscuss.member.posts.poll.create(
    connection,
    {
      postId: post.id,
      body: {
        question: RandomGenerator.paragraph({ sentences: 6 }),
        questionType: "likert",
        visibilityMode: "always_visible",
        expertOnly: false,
        allowVoteChange: true,
        scalePoints: 5,
        scaleMinLabel: "Strongly disagree",
        scaleMaxLabel: "Strongly agree",
        scaleMidLabel: "Neutral",
        startAt: new Date(now - 60_000).toISOString(),
        endAt: new Date(now + 10 * 60_000).toISOString(),
      } satisfies IEconDiscussPoll.ICreate,
    },
  );
  typia.assert(poll);
  TestValidator.equals(
    "poll is attached to the created post",
    poll.postId,
    post.id,
  );

  // 4) Switch to Member B (voter) and submit a Likert response
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

  const likertResponse = {
    questionType: "likert",
    likertValue: 3,
  } satisfies IEconDiscussPollResponse.ICreate;
  await api.functional.econDiscuss.member.posts.poll.responses.create(
    connection,
    {
      postId: post.id,
      body: likertResponse,
    },
  );

  // 5) Unauthenticated GET should error
  const anonymous: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated cannot view poll response detail",
    async () => {
      await api.functional.econDiscuss.member.posts.poll.responses.at(
        anonymous,
        {
          postId: post.id,
          responseId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 6) Switch to Member C (other) and verify cross-user restriction via error
  const memberC = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(memberC);

  await TestValidator.error(
    "other user cannot access another member's poll response",
    async () => {
      await api.functional.econDiscuss.member.posts.poll.responses.at(
        connection,
        {
          postId: post.id,
          responseId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 7) Mismatched post context should error
  const otherPost = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(otherPost);

  await TestValidator.error(
    "mismatched postId must not reveal response details",
    async () => {
      await api.functional.econDiscuss.member.posts.poll.responses.at(
        connection,
        {
          postId: otherPost.id,
          responseId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
