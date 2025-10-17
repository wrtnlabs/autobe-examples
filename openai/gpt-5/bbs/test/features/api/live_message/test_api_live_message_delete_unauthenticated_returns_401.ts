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
 * Ensure unauthenticated delete of a live message fails.
 *
 * Business flow:
 *
 * 1. Register a member (authenticated session) to create valid resources
 * 2. Create a post
 * 3. Create a live thread for the post
 * 4. Create a live message in the thread
 * 5. Attempt to delete the message using an unauthenticated connection
 *
 * Expectations:
 *
 * - All created resources are valid (asserted with typia)
 * - Unauthenticated deletion attempt throws an error (no status code assertion)
 */
export async function test_api_live_message_delete_unauthenticated_returns_401(
  connection: api.IConnection,
) {
  // 1) Authenticate as a new member (userA)
  const authorized = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(1),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(authorized);

  // 2) Create a post to host the live thread
  const postCreate = {
    title: RandomGenerator.paragraph({ sentences: 6 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies IEconDiscussPost.ICreate;
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: postCreate,
    },
  );
  typia.assert(post);

  // 3) Create a live thread for the post
  const liveThreadCreate = {
    state: "live" as IELiveThreadState,
    accessScope: "public" as IELiveThreadAccessScope,
    expertOnly: false,
    scheduledStartAt: null,
    slowModeIntervalSeconds: 2,
  } satisfies IEconDiscussLiveThread.ICreate;
  const thread = await api.functional.econDiscuss.member.posts.live.create(
    connection,
    {
      postId: post.id,
      body: liveThreadCreate,
    },
  );
  typia.assert(thread);

  // 4) Create a live message in the thread
  const messageCreate = {
    messageType: "text" as IELiveMessageType,
    content: RandomGenerator.paragraph({ sentences: 12 }),
    pinned: false,
  } satisfies IEconDiscussLiveMessage.ICreate;
  const message =
    await api.functional.econDiscuss.member.posts.live.messages.create(
      connection,
      {
        postId: post.id,
        body: messageCreate,
      },
    );
  typia.assert(message);

  // 5) Attempt to delete using an unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated delete must be rejected",
    async () => {
      await api.functional.econDiscuss.member.posts.live.messages.erase(
        unauthConn,
        {
          postId: post.id,
          messageId: message.id,
        },
      );
    },
  );
}
