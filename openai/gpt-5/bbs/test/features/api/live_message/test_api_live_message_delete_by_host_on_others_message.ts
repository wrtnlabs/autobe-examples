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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussLiveMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussLiveMessage";

/**
 * Verify that a live thread host can delete another user’s message and that
 * subsequent listings reflect the removal.
 *
 * Steps:
 *
 * 1. UserA joins (becomes authenticated) on its own connection (aConn).
 * 2. UserA creates a post and then a live thread attached to the post.
 * 3. UserB joins on a separate connection (bConn).
 * 4. UserB creates a text live message in userA’s live thread.
 * 5. UserA lists messages and confirms presence of the message.
 * 6. UserA deletes userB’s message via the host-privileged endpoint (void/204).
 * 7. UserA re-lists messages and verifies the message is absent.
 */
export async function test_api_live_message_delete_by_host_on_others_message(
  connection: api.IConnection,
) {
  // Keep independent authenticated sessions for userA and userB without
  // touching headers directly; SDK will manage Authorization per-connection.
  const aConn: api.IConnection = { ...connection };
  const bConn: api.IConnection = { ...connection };

  // 1) userA joins
  const joinABody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // >= 8 chars
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const authA = await api.functional.auth.member.join(aConn, {
    body: joinABody,
  });
  typia.assert(authA);

  // 2) userA creates a post
  const createPostBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IEconDiscussPost.ICreate;
  const post = await api.functional.econDiscuss.member.posts.create(aConn, {
    body: createPostBody,
  });
  typia.assert(post);

  // userA creates a live thread on the post
  const createThreadBody = {
    state: "live",
    expertOnly: false,
    accessScope: "public",
  } satisfies IEconDiscussLiveThread.ICreate;
  const thread = await api.functional.econDiscuss.member.posts.live.create(
    aConn,
    {
      postId: post.id,
      body: createThreadBody,
    },
  );
  typia.assert(thread);

  // Sanity check: the host of the thread should be userA
  TestValidator.equals(
    "thread host should be userA",
    thread.hostUserId,
    authA.id,
  );

  // 3) userB joins on a separate connection
  const joinBBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const authB = await api.functional.auth.member.join(bConn, {
    body: joinBBody,
  });
  typia.assert(authB);

  // 4) userB creates a live message in userA’s thread (by postId)
  const createMessageBody = {
    messageType: "text",
    content: RandomGenerator.paragraph({ sentences: 12 }),
    pinned: false,
  } satisfies IEconDiscussLiveMessage.ICreate;
  const message =
    await api.functional.econDiscuss.member.posts.live.messages.create(bConn, {
      postId: post.id,
      body: createMessageBody,
    });
  typia.assert(message);

  // Cross-check linkage
  TestValidator.equals(
    "created message belongs to the live thread",
    message.liveThreadId,
    thread.id,
  );

  // 5) userA lists messages and confirms presence
  const beforePage =
    await api.functional.econDiscuss.posts.live.messages.getByPostid(aConn, {
      postId: post.id,
    });
  typia.assert(beforePage);
  const existed = beforePage.data.find((m) => m.id === message.id);
  TestValidator.predicate(
    "created message should appear in listing before deletion",
    existed !== undefined,
  );

  // 6) userA deletes userB’s message (void/204)
  await api.functional.econDiscuss.member.posts.live.messages.erase(aConn, {
    postId: post.id,
    messageId: message.id,
  });

  // 7) Re-list and verify absence
  const afterPage =
    await api.functional.econDiscuss.posts.live.messages.getByPostid(aConn, {
      postId: post.id,
    });
  typia.assert(afterPage);
  TestValidator.predicate(
    "message should be absent from listing after deletion",
    afterPage.data.every((m) => m.id !== message.id),
  );
}
