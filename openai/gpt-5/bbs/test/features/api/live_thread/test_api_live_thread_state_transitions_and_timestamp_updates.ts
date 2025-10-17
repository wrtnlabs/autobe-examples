import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IELiveThreadAccessScope } from "@ORGANIZATION/PROJECT-api/lib/structures/IELiveThreadAccessScope";
import type { IELiveThreadState } from "@ORGANIZATION/PROJECT-api/lib/structures/IELiveThreadState";
import type { IEconDiscussLiveThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussLiveThread";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";

/**
 * Validate live thread lifecycle transitions and timestamp updates.
 *
 * Business flow:
 *
 * 1. Join as a member (issuing auth tokens automatically via SDK)
 * 2. Create a post as the authenticated member
 * 3. Create a live thread attached to the post
 * 4. Update the live thread through valid state transitions and settings updates:
 *
 *    - Live → expect startedAt set
 *    - Paused → expect pausedAt set
 *    - Live again → startedAt remains present
 *    - Update settings expertOnly=true, accessScope=followers_only → values persist
 *    - Ended → expect endedAt set
 * 5. Attempt illegal transition after ended (to live) → expect error
 *
 * Validations:
 *
 * - Ownership: thread.hostUserId equals caller id; post.author_user_id equals
 *   caller id
 * - Timestamps are present when applicable and conform to ISO 8601 (validated by
 *   typia.assert)
 * - Settings persist across subsequent reads/updates
 */
export async function test_api_live_thread_state_transitions_and_timestamp_updates(
  connection: api.IConnection,
) {
  // 1) Join as a member
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: `P@${RandomGenerator.alphaNumeric(10)}`,
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const authorized = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);
  const memberId = authorized.id;

  // 2) Create a post
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IEconDiscussPost.ICreate;
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: postBody,
    },
  );
  typia.assert(post);
  TestValidator.equals(
    "post is authored by the joined member",
    post.author_user_id,
    memberId,
  );

  // 3) Create initial live thread for the post
  const liveCreateBody = {
    state: "waiting" as IELiveThreadState,
    expertOnly: false,
    accessScope: "public" as IELiveThreadAccessScope,
  } satisfies IEconDiscussLiveThread.ICreate;
  const thread = await api.functional.econDiscuss.member.posts.live.create(
    connection,
    {
      postId: post.id,
      body: liveCreateBody,
    },
  );
  typia.assert(thread);
  TestValidator.equals(
    "live thread host user id matches caller",
    thread.hostUserId,
    memberId,
  );
  TestValidator.equals(
    "live thread is attached to the created post",
    thread.postId,
    post.id,
  );

  // 4-a) Transition to live → startedAt must be set
  const makeLive = await api.functional.econDiscuss.member.posts.live.update(
    connection,
    {
      postId: post.id,
      body: {
        state: "live" as IELiveThreadState,
      } satisfies IEconDiscussLiveThread.IUpdate,
    },
  );
  typia.assert(makeLive);
  TestValidator.equals("state moved to live", makeLive.state, "live");
  const startedAt1 = typia.assert<string & tags.Format<"date-time">>(
    makeLive.startedAt!,
  );
  void startedAt1; // keep for potential future comparisons

  // 4-b) Transition to paused → pausedAt must be set
  const makePaused = await api.functional.econDiscuss.member.posts.live.update(
    connection,
    {
      postId: post.id,
      body: {
        state: "paused" as IELiveThreadState,
      } satisfies IEconDiscussLiveThread.IUpdate,
    },
  );
  typia.assert(makePaused);
  TestValidator.equals("state moved to paused", makePaused.state, "paused");
  const pausedAt = typia.assert<string & tags.Format<"date-time">>(
    makePaused.pausedAt!,
  );
  void pausedAt;

  // 4-c) Transition back to live → startedAt remains present
  const makeLiveAgain =
    await api.functional.econDiscuss.member.posts.live.update(connection, {
      postId: post.id,
      body: {
        state: "live" as IELiveThreadState,
      } satisfies IEconDiscussLiveThread.IUpdate,
    });
  typia.assert(makeLiveAgain);
  TestValidator.equals("state resumed to live", makeLiveAgain.state, "live");
  const startedAt2 = typia.assert<string & tags.Format<"date-time">>(
    makeLiveAgain.startedAt!,
  );
  void startedAt2;

  // 4-d) Update settings → expertOnly=true, accessScope=followers_only
  const settingsUpdated =
    await api.functional.econDiscuss.member.posts.live.update(connection, {
      postId: post.id,
      body: {
        expertOnly: true,
        accessScope: "followers_only" as IELiveThreadAccessScope,
      } satisfies IEconDiscussLiveThread.IUpdate,
    });
  typia.assert(settingsUpdated);
  TestValidator.equals(
    "expertOnly flag updated",
    settingsUpdated.expertOnly,
    true,
  );
  TestValidator.equals(
    "accessScope updated",
    settingsUpdated.accessScope,
    "followers_only",
  );

  // 4-e) Transition to ended → endedAt must be set
  const makeEnded = await api.functional.econDiscuss.member.posts.live.update(
    connection,
    {
      postId: post.id,
      body: {
        state: "ended" as IELiveThreadState,
      } satisfies IEconDiscussLiveThread.IUpdate,
    },
  );
  typia.assert(makeEnded);
  TestValidator.equals("state moved to ended", makeEnded.state, "ended");
  const endedAt = typia.assert<string & tags.Format<"date-time">>(
    makeEnded.endedAt!,
  );
  void endedAt;

  // Settings should persist after end
  TestValidator.equals(
    "expertOnly persists after ending",
    makeEnded.expertOnly,
    true,
  );
  TestValidator.equals(
    "accessScope persists after ending",
    makeEnded.accessScope,
    "followers_only",
  );

  // 5) Illegal transition after ended → expect error
  await TestValidator.error(
    "cannot transition from ended back to live",
    async () => {
      await api.functional.econDiscuss.member.posts.live.update(connection, {
        postId: post.id,
        body: {
          state: "live" as IELiveThreadState,
        } satisfies IEconDiscussLiveThread.IUpdate,
      });
    },
  );
}
