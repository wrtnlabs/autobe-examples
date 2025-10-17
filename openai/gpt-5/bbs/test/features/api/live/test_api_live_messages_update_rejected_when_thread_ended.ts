import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IELiveMessageType } from "@ORGANIZATION/PROJECT-api/lib/structures/IELiveMessageType";
import type { IELiveThreadAccessScope } from "@ORGANIZATION/PROJECT-api/lib/structures/IELiveThreadAccessScope";
import type { IELiveThreadState } from "@ORGANIZATION/PROJECT-api/lib/structures/IELiveThreadState";
import type { IEconDiscussLiveMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussLiveMessage";
import type { IEconDiscussLiveThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussLiveThread";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";
import type { IEconDiscussUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUser";

/**
 * Reject editing a live message after the parent thread is ended.
 *
 * Business context:
 *
 * - Members can create posts and attach a live discussion thread.
 * - While the live thread is in a writable state (e.g., "live"), authors can post
 *   messages.
 * - After the thread moves to an immutable state (e.g., "ended"), edits should be
 *   rejected unless governance explicitly permits them. This test validates
 *   that protection.
 *
 * Steps:
 *
 * 1. Join as a member (author)
 * 2. Create a post to host the live thread
 * 3. Create a live thread in state="live" (writable)
 * 4. Create a text live message in the thread
 * 5. Transition the thread to state="ended"
 * 6. Attempt to edit the message -> expect error (editing blocked)
 * 7. Optional strengthening: attempt to create a new message after end -> expect
 *    error
 */
export async function test_api_live_messages_update_rejected_when_thread_ended(
  connection: api.IConnection,
) {
  // 1) Join as a member (author)
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(member);

  // 2) Create a post to host the live thread
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

  // 3) Create a live thread in state="live"
  const thread = await api.functional.econDiscuss.member.posts.live.create(
    connection,
    {
      postId: post.id,
      body: {
        state: "live",
        expertOnly: false,
        accessScope: "public",
      } satisfies IEconDiscussLiveThread.ICreate,
    },
  );
  typia.assert(thread);

  // 4) Create a text live message in the thread
  const message =
    await api.functional.econDiscuss.member.posts.live.messages.create(
      connection,
      {
        postId: post.id,
        body: {
          messageType: "text",
          content: RandomGenerator.paragraph({ sentences: 8 }),
          pinned: false,
        } satisfies IEconDiscussLiveMessage.ICreate,
      },
    );
  typia.assert(message);

  // Sanity check linkage: message belongs to the newly created thread
  TestValidator.equals(
    "message.liveThreadId equals created thread.id",
    message.liveThreadId,
    thread.id,
  );

  // 5) Transition the thread to state="ended"
  const ended = await api.functional.econDiscuss.member.posts.live.update(
    connection,
    {
      postId: post.id,
      body: {
        state: "ended",
      } satisfies IEconDiscussLiveThread.IUpdate,
    },
  );
  typia.assert(ended);
  TestValidator.equals("thread state moved to ended", ended.state, "ended");

  // 6) Attempt to edit the message -> expect error
  await TestValidator.error(
    "editing message is rejected after thread ended",
    async () => {
      await api.functional.econDiscuss.member.posts.live.messages.update(
        connection,
        {
          postId: post.id,
          messageId: message.id,
          body: {
            content: RandomGenerator.paragraph({ sentences: 5 }),
          } satisfies IEconDiscussLiveMessage.IUpdate,
        },
      );
    },
  );

  // 7) Optional strengthening: attempting to create a new message should also be rejected
  await TestValidator.error(
    "creating new message is rejected after thread ended",
    async () => {
      await api.functional.econDiscuss.member.posts.live.messages.create(
        connection,
        {
          postId: post.id,
          body: {
            messageType: "text",
            content: RandomGenerator.paragraph({ sentences: 6 }),
            pinned: false,
          } satisfies IEconDiscussLiveMessage.ICreate,
        },
      );
    },
  );
}
