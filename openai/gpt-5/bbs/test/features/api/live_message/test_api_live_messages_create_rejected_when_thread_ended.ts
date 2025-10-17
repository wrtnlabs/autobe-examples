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
 * Reject posting a live message when the thread is ended.
 *
 * This test verifies that once a live discussion thread is transitioned to the
 * "ended" state, the API forbids creating additional live messages in that
 * thread.
 *
 * Steps:
 *
 * 1. Authenticate as a member (join).
 * 2. Create a post to host the live thread.
 * 3. Create a live thread for the post (initial state allowed by policy).
 * 4. Transition the live thread to state = "ended" and validate state/timestamps.
 * 5. Attempt to publish a live message and assert that it fails.
 */
export async function test_api_live_messages_create_rejected_when_thread_ended(
  connection: api.IConnection,
) {
  // 1) Authenticate as member
  const authorized = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd!", // >= 8 chars
      display_name: RandomGenerator.name(1),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(authorized);

  // 2) Create a host post
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(post);

  // 3) Create a live thread for the post (start as live to be explicit)
  const thread = await api.functional.econDiscuss.member.posts.live.create(
    connection,
    {
      postId: post.id,
      body: {
        state: "live",
      } satisfies IEconDiscussLiveThread.ICreate,
    },
  );
  typia.assert(thread);
  TestValidator.equals(
    "created thread should belong to the post",
    thread.postId,
    post.id,
  );

  // 4) Transition the thread to ended
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
  TestValidator.equals("thread state is ended", ended.state, "ended");
  TestValidator.predicate(
    "endedAt timestamp is set after ending",
    ended.endedAt !== null && ended.endedAt !== undefined,
  );

  // 5) Attempt to post a live message and expect rejection
  await TestValidator.error(
    "posting message should be rejected when thread is ended",
    async () => {
      await api.functional.econDiscuss.member.posts.live.messages.create(
        connection,
        {
          postId: post.id,
          body: {
            messageType: "text",
            content: RandomGenerator.paragraph({ sentences: 8 }),
          } satisfies IEconDiscussLiveMessage.ICreate,
        },
      );
    },
  );
}
