import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPoll";
import type { IEconDiscussPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollOption";
import type { IEconDiscussPollQuestionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollQuestionType";
import type { IEconDiscussPollVisibilityMode } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollVisibilityMode";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";

export async function test_api_poll_configuration_public_retrieval_for_post(
  connection: api.IConnection,
) {
  /**
   * Validate that poll configuration is publicly retrievable for a post, and
   * missing/retired polls are not retrievable.
   *
   * Steps:
   *
   * 1. Join as a member (auth is needed only for setup)
   * 2. Create a post
   * 3. Create a single_choice poll with always_visible visibility and options
   * 4. Publicly GET the poll (no Authorization) and verify configuration
   * 5. Create another post with no poll and verify GET fails
   * 6. Retire the first poll (DELETE) and verify GET fails again
   */
  // 1) Member registration (join)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd1",
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const authorized = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 2) Create a post as the member
  const postCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies IEconDiscussPost.ICreate;
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: postCreateBody,
    },
  );
  typia.assert(post);

  // 3) Create a poll for that post
  const now = new Date();
  const later = new Date(now.getTime() + 1000 * 60 * 60); // +1 hour
  const options = [
    { text: RandomGenerator.paragraph({ sentences: 2 }), position: 0 },
    { text: RandomGenerator.paragraph({ sentences: 2 }), position: 1 },
    { text: RandomGenerator.paragraph({ sentences: 2 }), position: 2 },
  ] satisfies IEconDiscussPollOption.ICreate[];
  const pollCreateBody = {
    question: RandomGenerator.paragraph({ sentences: 5 }),
    questionType: "single_choice" as IEconDiscussPollQuestionType,
    visibilityMode: "always_visible" as IEconDiscussPollVisibilityMode,
    expertOnly: false,
    allowVoteChange: true,
    startAt: now.toISOString(),
    endAt: later.toISOString(),
    options,
  } satisfies IEconDiscussPoll.ICreate;
  const createdPoll = await api.functional.econDiscuss.member.posts.poll.create(
    connection,
    {
      postId: post.id,
      body: pollCreateBody,
    },
  );
  typia.assert(createdPoll);

  // 4) Public retrieval without Authorization
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const publicPoll = await api.functional.econDiscuss.posts.poll.at(
    unauthConn,
    {
      postId: post.id,
    },
  );
  typia.assert(publicPoll);

  // Business-level validations (not type checks)
  TestValidator.equals(
    "public poll belongs to the post",
    publicPoll.postId,
    post.id,
  );
  TestValidator.equals(
    "public poll question matches creation",
    publicPoll.question,
    pollCreateBody.question,
  );
  TestValidator.equals(
    "public poll questionType",
    publicPoll.questionType,
    pollCreateBody.questionType,
  );
  TestValidator.equals(
    "public poll visibilityMode",
    publicPoll.visibilityMode,
    pollCreateBody.visibilityMode,
  );
  TestValidator.equals(
    "public poll allowVoteChange",
    publicPoll.allowVoteChange,
    pollCreateBody.allowVoteChange,
  );
  TestValidator.equals(
    "public poll expertOnly",
    publicPoll.expertOnly,
    pollCreateBody.expertOnly,
  );

  // Validate options ordering by position and texts
  const expectedOptionTexts = options
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((o) => o.text);
  const actualOptionTexts = publicPoll.options
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((o) => o.text);
  TestValidator.equals(
    "public poll options text by position",
    actualOptionTexts,
    expectedOptionTexts,
  );

  // 5) Missing resource: another post without a poll
  const postWithoutPollBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IEconDiscussPost.ICreate;
  const postWithoutPoll = await api.functional.econDiscuss.member.posts.create(
    connection,
    { body: postWithoutPollBody },
  );
  typia.assert(postWithoutPoll);

  await TestValidator.error(
    "public GET on post without poll should error",
    async () => {
      await api.functional.econDiscuss.posts.poll.at(unauthConn, {
        postId: postWithoutPoll.id,
      });
    },
  );

  // 6) Retirement: delete the poll then public GET should fail
  await api.functional.econDiscuss.member.posts.poll.erase(connection, {
    postId: post.id,
  });
  await TestValidator.error(
    "public GET on retired poll should error",
    async () => {
      await api.functional.econDiscuss.posts.poll.at(unauthConn, {
        postId: post.id,
      });
    },
  );
}
