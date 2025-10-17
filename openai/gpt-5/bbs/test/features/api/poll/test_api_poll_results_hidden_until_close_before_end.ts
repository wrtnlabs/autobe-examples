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

export async function test_api_poll_results_hidden_until_close_before_end(
  connection: api.IConnection,
) {
  /**
   * Validate that poll results stay hidden while the poll is still open when
   * visibilityMode is "hidden_until_close". Also verify a second immediate
   * attempt is rejected the same way (idempotent denial), regardless of whether
   * the caller has already voted.
   *
   * Steps:
   *
   * 1. Join as a new member (auth token auto-applied to connection)
   * 2. Create a Post
   * 3. Create a Poll on the Post with hidden_until_close and future endAt
   * 4. Create two options
   * 5. Submit one single-choice response (optional, ensures votes exist)
   * 6. Attempt to compute results before endAt and expect an error
   * 7. Retry immediately and expect the same error
   */

  // 1) Join as a new member
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // >= 8 characters
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const auth: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBody });
  typia.assert(auth);

  // 2) Create a Post
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 5 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 10 }),
    scheduled_publish_at: null,
  } satisfies IEconDiscussPost.ICreate;
  const post: IEconDiscussPost =
    await api.functional.econDiscuss.member.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 3) Create a Poll on the Post with hidden_until_close and future endAt
  const now = new Date();
  const startAt = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const endAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString();

  const pollBody = {
    question: RandomGenerator.paragraph({ sentences: 6 }),
    questionType: "single_choice" as IEconDiscussPollQuestionType,
    visibilityMode: "hidden_until_close" as IEconDiscussPollVisibilityMode,
    expertOnly: false,
    allowVoteChange: true,
    startAt,
    endAt,
  } satisfies IEconDiscussPoll.ICreate;
  const poll: IEconDiscussPoll =
    await api.functional.econDiscuss.member.posts.poll.create(connection, {
      postId: post.id,
      body: pollBody,
    });
  typia.assert(poll);
  TestValidator.equals(
    "poll is linked to the created post",
    poll.postId,
    post.id,
  );

  // 4) Create two options
  const optionA: IEconDiscussPollOption =
    await api.functional.econDiscuss.member.posts.poll.options.create(
      connection,
      {
        postId: post.id,
        body: {
          text: "Option A",
          position: 1,
        } satisfies IEconDiscussPollOption.ICreate,
      },
    );
  typia.assert(optionA);

  const optionB: IEconDiscussPollOption =
    await api.functional.econDiscuss.member.posts.poll.options.create(
      connection,
      {
        postId: post.id,
        body: {
          text: "Option B",
          position: 2,
        } satisfies IEconDiscussPollOption.ICreate,
      },
    );
  typia.assert(optionB);

  // 5) Submit one single-choice response (should not change hidden policy)
  await api.functional.econDiscuss.member.posts.poll.responses.create(
    connection,
    {
      postId: post.id,
      body: {
        questionType: "single_choice" as IEPollQuestionType,
        optionId: optionA.id,
      } satisfies IEconDiscussPollResponse.ICreate,
    },
  );

  // 6) Attempt to compute results before endAt → expect an error due to hidden_until_close
  await TestValidator.error(
    "running results must be hidden before endAt (first attempt)",
    async () => {
      await api.functional.econDiscuss.posts.poll.results.index(connection, {
        postId: post.id,
        body: {
          includeOptionBreakdown: true,
        } satisfies IEconDiscussPollResult.IRequest,
      });
    },
  );

  // 7) Retry immediately → still expect error (idempotent denial while open)
  await TestValidator.error(
    "running results must be hidden before endAt (retry)",
    async () => {
      await api.functional.econDiscuss.posts.poll.results.index(connection, {
        postId: post.id,
        body: {
          includeOptionBreakdown: true,
        } satisfies IEconDiscussPollResult.IRequest,
      });
    },
  );
}
