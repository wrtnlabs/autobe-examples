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

/**
 * Create a single-choice poll on a member-owned post and validate persistence
 * and constraints.
 *
 * Business flow:
 *
 * 1. Join as a new member to obtain an authenticated session
 * 2. Create a post to host the poll and capture its id
 * 3. Create a poll with valid single_choice configuration and three unique options
 * 4. Validate the created poll's association to the post and persisted fields
 * 5. Constraint checks (business-error only):
 *
 *    - One-poll-per-post: creating another poll on same post must error
 *    - Option uniqueness: duplicate option text/position in same payload must error
 *         (use another post)
 */
export async function test_api_poll_creation_for_post_success(
  connection: api.IConnection,
) {
  // 1) Authenticate (join) as a new member
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!", // >= 8 chars per spec
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const authorized = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 2) Create a host post
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 5 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IEconDiscussPost.ICreate;
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: postBody,
    },
  );
  typia.assert(post);

  // 3) Create a poll for the post
  const now = Date.now();
  const startAt = new Date(now - 60_000).toISOString(); // past 1 minute
  const endAt = new Date(now + 24 * 60 * 60 * 1000).toISOString(); // +1 day

  const base = RandomGenerator.name(1);
  const optionTexts = [`${base} 1`, `${base} 2`, `${base} 3`];
  const pollCreateBody = {
    question: RandomGenerator.paragraph({ sentences: 3 }),
    questionType: "single_choice",
    visibilityMode: "visible_after_vote",
    expertOnly: false,
    allowVoteChange: true,
    minVoterReputation: 0,
    startAt,
    endAt,
    options: [
      { text: optionTexts[0], position: 1 },
      { text: optionTexts[1], position: 2 },
      { text: optionTexts[2], position: 3 },
    ],
  } satisfies IEconDiscussPoll.ICreate;

  const poll = await api.functional.econDiscuss.member.posts.poll.create(
    connection,
    {
      postId: post.id,
      body: pollCreateBody,
    },
  );
  typia.assert(poll);

  // 4) Validate created poll fields and options
  TestValidator.equals("poll belongs to the host post", poll.postId, post.id);
  TestValidator.equals(
    "question persisted",
    poll.question,
    pollCreateBody.question,
  );
  TestValidator.equals(
    "question type persisted",
    poll.questionType,
    pollCreateBody.questionType,
  );
  TestValidator.equals(
    "visibility mode persisted",
    poll.visibilityMode,
    pollCreateBody.visibilityMode,
  );
  TestValidator.equals(
    "expertOnly persisted",
    poll.expertOnly,
    pollCreateBody.expertOnly,
  );
  TestValidator.equals(
    "allowVoteChange persisted",
    poll.allowVoteChange,
    pollCreateBody.allowVoteChange,
  );
  TestValidator.equals(
    "minVoterReputation persisted",
    poll.minVoterReputation,
    pollCreateBody.minVoterReputation,
  );
  TestValidator.equals(
    "startAt persisted",
    poll.startAt,
    pollCreateBody.startAt,
  );
  TestValidator.equals("endAt persisted", poll.endAt, pollCreateBody.endAt);

  // options count and content
  TestValidator.equals("options length is 3", poll.options.length, 3);
  const actualSorted = [...poll.options].sort(
    (a, b) => a.position - b.position,
  );
  const actualPositions = actualSorted.map((o) => o.position);
  const expectedPositions = [1, 2, 3];
  TestValidator.equals(
    "option positions persisted in ascending order",
    actualPositions,
    expectedPositions,
  );
  const actualTexts = actualSorted.map((o) => o.text);
  TestValidator.equals(
    "option texts persisted in order",
    actualTexts,
    optionTexts,
  );

  // 5-A) One-poll-per-post: second create on same post should fail
  await TestValidator.error("one-poll-per-post must be enforced", async () => {
    await api.functional.econDiscuss.member.posts.poll.create(connection, {
      postId: post.id,
      body: pollCreateBody,
    });
  });

  // 5-B) Option uniqueness (duplicate text/position) on a different post should fail
  const post2Body = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IEconDiscussPost.ICreate;
  const post2 = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: post2Body,
    },
  );
  typia.assert(post2);

  const dupText = RandomGenerator.paragraph({ sentences: 2 });
  const invalidPollBody = {
    question: RandomGenerator.paragraph({ sentences: 2 }),
    questionType: "single_choice",
    visibilityMode: "visible_after_vote",
    expertOnly: false,
    allowVoteChange: true,
    minVoterReputation: 0,
    startAt,
    endAt,
    options: [
      { text: dupText, position: 1 },
      { text: dupText, position: 2 }, // duplicate text within same payload
      { text: RandomGenerator.paragraph({ sentences: 2 }), position: 2 }, // duplicate position
    ],
  } satisfies IEconDiscussPoll.ICreate;

  await TestValidator.error(
    "duplicate option text/position must be rejected",
    async () => {
      await api.functional.econDiscuss.member.posts.poll.create(connection, {
        postId: post2.id,
        body: invalidPollBody,
      });
    },
  );
}
