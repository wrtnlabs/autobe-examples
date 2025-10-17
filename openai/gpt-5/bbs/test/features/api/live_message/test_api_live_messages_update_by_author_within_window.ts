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
 * Validate that a message author can edit their own live message within the
 * allowed window.
 *
 * Flow:
 *
 * 1. Member joins (receives auth tokens handled by SDK)
 * 2. Member creates a post
 * 3. Member creates a live thread for that post (state = "live")
 * 4. Member posts a text message (pinned = false)
 * 5. Immediately updates the message content (within edit window)
 *
 * Validations:
 *
 * - Response typing with typia.assert for every call
 * - Updated message:
 *
 *   - Same id and same liveThreadId as the original
 *   - Content equals the updated content
 *   - EditedAt is set (non-null/undefined)
 *   - Pinned remains unchanged (we did not request a pin toggle)
 *   - MessageType remains unchanged ("text")
 * - If authorUserId is present, it matches the authenticated member id
 */
export async function test_api_live_messages_update_by_author_within_window(
  connection: api.IConnection,
) {
  // 1) Join as member (author)
  const joinOutput = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(joinOutput);

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

  // 3) Create a live thread attached to the post (state = "live")
  const liveThread = await api.functional.econDiscuss.member.posts.live.create(
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
  typia.assert(liveThread);

  // 4) Create an initial text message (pinned = false)
  const initialContent = RandomGenerator.paragraph({ sentences: 8 });
  const createdMsg =
    await api.functional.econDiscuss.member.posts.live.messages.create(
      connection,
      {
        postId: post.id,
        body: {
          messageType: "text",
          content: initialContent,
          pinned: false,
        } satisfies IEconDiscussLiveMessage.ICreate,
      },
    );
  typia.assert(createdMsg);

  // 5) Update message content only (avoid pin toggle to bypass role gating)
  const updatedContent = RandomGenerator.paragraph({ sentences: 10 });
  const updatedMsg =
    await api.functional.econDiscuss.member.posts.live.messages.update(
      connection,
      {
        postId: post.id,
        messageId: createdMsg.id,
        body: {
          content: updatedContent,
        } satisfies IEconDiscussLiveMessage.IUpdate,
      },
    );
  typia.assert(updatedMsg);

  // Core validations
  TestValidator.equals(
    "message id remains the same",
    updatedMsg.id,
    createdMsg.id,
  );
  TestValidator.equals(
    "message remains in the same live thread",
    updatedMsg.liveThreadId,
    liveThread.id,
  );
  TestValidator.equals(
    "message content updated to requested value",
    updatedMsg.content,
    updatedContent,
  );
  TestValidator.equals(
    "message type remains unchanged",
    updatedMsg.messageType,
    createdMsg.messageType,
  );
  TestValidator.equals(
    "pinned state remains unchanged when not requested",
    updatedMsg.pinned,
    createdMsg.pinned,
  );
  TestValidator.predicate(
    "editedAt must be present after update",
    updatedMsg.editedAt !== null && updatedMsg.editedAt !== undefined,
  );

  // If author identity is exposed, it must match the authenticated member
  if (
    updatedMsg.authorUserId !== null &&
    updatedMsg.authorUserId !== undefined
  ) {
    TestValidator.equals(
      "authorUserId matches authenticated member id",
      updatedMsg.authorUserId,
      joinOutput.id,
    );
  }
}
