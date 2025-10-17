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

export async function test_api_live_messages_get_by_id_cross_thread_mismatch_404(
  connection: api.IConnection,
) {
  // 1) Authenticate as a member (join)
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password-1234", // >= 8 chars
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(member);

  // 2) Create Post A
  const postABody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IEconDiscussPost.ICreate;
  const postA = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: postABody,
    },
  );
  typia.assert(postA);

  // 3) Create Live Thread A under Post A
  const threadABody = {
    state: "live",
    accessScope: "public",
  } satisfies IEconDiscussLiveThread.ICreate;
  const threadA = await api.functional.econDiscuss.member.posts.live.create(
    connection,
    {
      postId: postA.id,
      body: threadABody,
    },
  );
  typia.assert(threadA);
  TestValidator.equals(
    "thread A is attached to Post A",
    threadA.postId,
    postA.id,
  );

  // 4) Create a message in Thread A (via Post A path)
  const messageABody = {
    messageType: "text",
    content: RandomGenerator.paragraph({ sentences: 8 }),
    pinned: false,
  } satisfies IEconDiscussLiveMessage.ICreate;
  const messageA =
    await api.functional.econDiscuss.member.posts.live.messages.create(
      connection,
      {
        postId: postA.id,
        body: messageABody,
      },
    );
  typia.assert(messageA);
  TestValidator.equals(
    "message A belongs to thread A",
    messageA.liveThreadId,
    threadA.id,
  );

  // 5) Create Post B and Live Thread B
  const postBBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IEconDiscussPost.ICreate;
  const postB = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: postBBody,
    },
  );
  typia.assert(postB);

  const threadBBody = {
    state: "live",
    accessScope: "public",
  } satisfies IEconDiscussLiveThread.ICreate;
  const threadB = await api.functional.econDiscuss.member.posts.live.create(
    connection,
    {
      postId: postB.id,
      body: threadBBody,
    },
  );
  typia.assert(threadB);
  TestValidator.equals(
    "thread B is attached to Post B",
    threadB.postId,
    postB.id,
  );

  // 6) Positive check: GET by correct postId and messageId should succeed
  const readOnA = await api.functional.econDiscuss.posts.live.messages.at(
    connection,
    {
      postId: postA.id,
      messageId: messageA.id,
    },
  );
  typia.assert(readOnA);
  TestValidator.equals(
    "reading on Post A returns the correct message",
    readOnA.id,
    messageA.id,
  );

  // 7) Negative case: cross-thread mismatch should error (original scenario: 404)
  await TestValidator.error(
    "reading message A under Post B should fail",
    async () => {
      await api.functional.econDiscuss.posts.live.messages.at(connection, {
        postId: postB.id,
        messageId: messageA.id,
      });
    },
  );
}
