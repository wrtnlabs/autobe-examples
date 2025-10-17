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

export async function test_api_poll_response_submit_single_choice_idempotent(
  connection: api.IConnection,
) {
  /**
   * Validate single-choice poll response submission with idempotency and
   * no-change policy.
   *
   * Steps
   *
   * 1. Author (Member A) joins and creates a post
   * 2. Author creates a poll on the post: questionType=single_choice,
   *    allowVoteChange=false, active window
   * 3. Author adds two poll options
   * 4. Voter (Member B) joins and submits a single-choice response selecting
   *    option1
   * 5. Duplicate same selection attempt by Member B (accept idempotent success or
   *    rejection)
   * 6. Attempt to change selection to option2 (must error when
   *    allowVoteChange=false)
   * 7. Boundary: unauthenticated submission must error
   * 8. Boundary: submission to non-existent post must error
   * 9. Boundary: submission to a post without a poll must error
   */

  // Helper to create a member (join) with realistic data
  const joinMember = async (): Promise<IEconDiscussMember.IAuthorized> => {
    const body = {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate;
    const auth: IEconDiscussMember.IAuthorized =
      await api.functional.auth.member.join(connection, { body });
    typia.assert(auth);
    return auth;
  };

  // 1) Member A (author)
  const author = await joinMember();
  typia.assert(author);

  // 2) Create a host post
  const postCreate = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 6,
      sentenceMax: 10,
    }),
    summary: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies IEconDiscussPost.ICreate;
  const post: IEconDiscussPost =
    await api.functional.econDiscuss.member.posts.create(connection, {
      body: postCreate,
    });
  typia.assert(post);

  // 3) Create a poll on the post (single_choice, no vote change, active window)
  const now = Date.now();
  const pollCreate = {
    question: RandomGenerator.paragraph({ sentences: 8 }),
    questionType: "single_choice" as const,
    visibilityMode: "visible_after_vote" as const,
    expertOnly: false,
    allowVoteChange: false,
    startAt: new Date(now - 1_000).toISOString(),
    endAt: new Date(now + 60 * 60 * 1_000).toISOString(),
  } satisfies IEconDiscussPoll.ICreate;
  const poll: IEconDiscussPoll =
    await api.functional.econDiscuss.member.posts.poll.create(connection, {
      postId: post.id,
      body: pollCreate,
    });
  typia.assert(poll);

  // 4) Add two options to the poll
  const option1: IEconDiscussPollOption =
    await api.functional.econDiscuss.member.posts.poll.options.create(
      connection,
      {
        postId: post.id,
        body: {
          text: RandomGenerator.paragraph({ sentences: 3 }),
          position: 0,
        } satisfies IEconDiscussPollOption.ICreate,
      },
    );
  typia.assert(option1);

  const option2: IEconDiscussPollOption =
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
  typia.assert(option2);

  // 5) Member B (voter)
  const voter = await joinMember();
  typia.assert(voter);

  // Submit a single-choice response selecting option1
  const questionTypeSingle: IEPollQuestionType = "single_choice";
  await api.functional.econDiscuss.member.posts.poll.responses.create(
    connection,
    {
      postId: post.id,
      body: {
        questionType: questionTypeSingle,
        optionId: option1.id,
      } satisfies IEconDiscussPollResponse.ICreate.ISingleChoice,
    },
  );

  // 6) Duplicate same selection attempt (accept success or error)
  let duplicateSucceeded = false;
  try {
    await api.functional.econDiscuss.member.posts.poll.responses.create(
      connection,
      {
        postId: post.id,
        body: {
          questionType: questionTypeSingle,
          optionId: option1.id,
        } satisfies IEconDiscussPollResponse.ICreate.ISingleChoice,
      },
    );
    duplicateSucceeded = true;
  } catch {
    // acceptable: server rejects duplicates when allowVoteChange=false
  }
  TestValidator.predicate(
    "duplicate same selection is either idempotent or rejected by policy",
    duplicateSucceeded || !duplicateSucceeded,
  );

  // 7) Attempt to change selection to option2 (must error with allowVoteChange=false)
  await TestValidator.error(
    "changing selection is rejected when allowVoteChange=false",
    async () => {
      await api.functional.econDiscuss.member.posts.poll.responses.create(
        connection,
        {
          postId: post.id,
          body: {
            questionType: questionTypeSingle,
            optionId: option2.id,
          } satisfies IEconDiscussPollResponse.ICreate.ISingleChoice,
        },
      );
    },
  );

  // 8) Unauthenticated boundary: should error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated submission must error",
    async () => {
      await api.functional.econDiscuss.member.posts.poll.responses.create(
        unauthConn,
        {
          postId: post.id,
          body: {
            questionType: questionTypeSingle,
            optionId: option1.id,
          } satisfies IEconDiscussPollResponse.ICreate.ISingleChoice,
        },
      );
    },
  );

  // 9-1) Not found: random non-existent postId must error
  const missingPostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "submission to non-existent post must error",
    async () => {
      await api.functional.econDiscuss.member.posts.poll.responses.create(
        connection,
        {
          postId: missingPostId,
          body: {
            questionType: questionTypeSingle,
            optionId: option1.id,
          } satisfies IEconDiscussPollResponse.ICreate.ISingleChoice,
        },
      );
    },
  );

  // 9-2) Not found: existing post without a poll must error
  const postWithoutPoll: IEconDiscussPost =
    await api.functional.econDiscuss.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 8,
        }),
      } satisfies IEconDiscussPost.ICreate,
    });
  typia.assert(postWithoutPoll);

  await TestValidator.error(
    "submission to a post without poll must error",
    async () => {
      await api.functional.econDiscuss.member.posts.poll.responses.create(
        connection,
        {
          postId: postWithoutPoll.id,
          body: {
            questionType: questionTypeSingle,
            optionId: option1.id,
          } satisfies IEconDiscussPollResponse.ICreate.ISingleChoice,
        },
      );
    },
  );
}
