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
 * Validate idempotent deletion of a poll attached to a post.
 *
 * Steps
 *
 * 1. Join as a member to acquire an access token.
 * 2. Create a post as the authenticated member.
 * 3. Create a single_choice poll with three options on that post.
 * 4. DELETE the poll once (retire it).
 * 5. DELETE the poll again (no-op success) to validate idempotency.
 *
 * Notes
 *
 * - SDK sets Authorization header on successful join; do not manipulate headers.
 * - We do not assert HTTP status codes or internal soft-delete markers.
 * - Erase() returns void; do not call typia.assert on its result.
 */
export async function test_api_poll_delete_idempotent_on_repeat(
  connection: api.IConnection,
) {
  // 1) Authenticate (join) as a new member
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const auth: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBody });
  typia.assert(auth);

  // 2) Create a post
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 5 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies IEconDiscussPost.ICreate;
  const post: IEconDiscussPost =
    await api.functional.econDiscuss.member.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);
  TestValidator.equals(
    "post author should equal authenticated member id",
    post.author_user_id,
    auth.id,
  );

  // 3) Create a poll on the post
  const nowIso: string = new Date().toISOString();
  const endIso: string = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const pollBody = {
    question: "Which policy action best addresses inflation in the near term?",
    questionType: "single_choice",
    visibilityMode: "always_visible",
    expertOnly: false,
    allowVoteChange: true,
    startAt: nowIso,
    endAt: endIso,
    options: [
      { text: "Raise policy rates", position: 0 },
      { text: "Hold rates", position: 1 },
      { text: "Cut rates", position: 2 },
    ],
  } satisfies IEconDiscussPoll.ICreate;
  const poll: IEconDiscussPoll =
    await api.functional.econDiscuss.member.posts.poll.create(connection, {
      postId: post.id,
      body: pollBody,
    });
  typia.assert(poll);
  TestValidator.equals(
    "poll is attached to created post",
    poll.postId,
    post.id,
  );
  TestValidator.predicate(
    "poll created with exactly three options",
    poll.options.length === 3,
  );

  // 4) Delete the poll (retire)
  await api.functional.econDiscuss.member.posts.poll.erase(connection, {
    postId: post.id,
  });

  // 5) Delete again - must be idempotent (no error)
  await api.functional.econDiscuss.member.posts.poll.erase(connection, {
    postId: post.id,
  });
}
