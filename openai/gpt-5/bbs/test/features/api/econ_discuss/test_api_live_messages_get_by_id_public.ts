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
 * Public GET of a specific live message by ID for a post.
 *
 * Flow:
 *
 * 1. Member joins (seed authentication context)
 * 2. Member creates a post
 * 3. Member creates a public, live-thread for the post
 * 4. Member creates a live message (text) and captures IDs
 * 5. Anonymous client retrieves the message by (postId, messageId)
 * 6. Validate message core fields and scoping; ensure not soft-deleted
 * 7. Negative: random messageId retrieval results in an error
 */
export async function test_api_live_messages_get_by_id_public(
  connection: api.IConnection,
) {
  // 1) Member joins
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(12); // ≥ 8 chars
  const displayName: string = RandomGenerator.name(2);

  const authorized = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
      display_name: displayName,
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(authorized);

  // 2) Create a post
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        summary: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(post);

  // 3) Create a live thread with public access, live state
  const thread = await api.functional.econDiscuss.member.posts.live.create(
    connection,
    {
      postId: post.id,
      body: {
        state: "live",
        accessScope: "public",
        expertOnly: false,
      } satisfies IEconDiscussLiveThread.ICreate,
    },
  );
  typia.assert(thread);
  TestValidator.equals("live thread belongs to post", thread.postId, post.id);

  // 4) Create a live message (text)
  const createdMsg =
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
  typia.assert(createdMsg);

  // 5) Public (anonymous) retrieval
  const publicConn: api.IConnection = { ...connection, headers: {} };
  const read = await api.functional.econDiscuss.posts.live.messages.at(
    publicConn,
    {
      postId: post.id,
      messageId: createdMsg.id,
    },
  );
  typia.assert(read);

  // 6) Business validations
  TestValidator.equals(
    "returned message id matches created",
    read.id,
    createdMsg.id,
  );
  TestValidator.equals(
    "message belongs to same live thread",
    read.liveThreadId,
    thread.id,
  );
  TestValidator.equals(
    "messageType preserved",
    read.messageType,
    createdMsg.messageType,
  );
  TestValidator.equals("content preserved", read.content, createdMsg.content);
  TestValidator.equals("pinned flag preserved", read.pinned, createdMsg.pinned);
  TestValidator.predicate(
    "deletedAt should be null or undefined for active message",
    read.deletedAt === null || read.deletedAt === undefined,
  );

  // 7) Negative: random messageId should fail (no status code assertion)
  await TestValidator.error(
    "non-existent messageId retrieval should error",
    async () => {
      await api.functional.econDiscuss.posts.live.messages.at(publicConn, {
        postId: post.id,
        messageId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
