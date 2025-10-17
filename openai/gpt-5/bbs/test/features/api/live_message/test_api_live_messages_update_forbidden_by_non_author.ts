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

export async function test_api_live_messages_update_forbidden_by_non_author(
  connection: api.IConnection,
) {
  /**
   * Validate that a non-author member cannot update another user's live
   * message.
   *
   * Steps:
   *
   * 1. Member A joins (authenticated) and creates a post.
   * 2. Member A creates a live thread on the post.
   * 3. Member A publishes a text live message in the thread.
   * 4. Member A successfully updates their own message (positive path baseline).
   * 5. Member B joins (switches auth context), then attempts to update A's message
   *    → expected to fail.
   *
   * Notes:
   *
   * - SDK manages Authorization automatically on join; no manual header edits.
   * - We avoid status code assertions; only validate that an error occurs for the
   *   forbidden case.
   */

  // 1) Member A registers and authenticates
  const memberAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberA = await api.functional.auth.member.join(connection, {
    body: {
      email: memberAEmail,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
      avatar_uri: undefined,
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(memberA);

  // 2) Member A creates a post
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        summary: RandomGenerator.paragraph({ sentences: 8 }),
        scheduled_publish_at: null,
        topicIds: undefined,
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(post);

  // 3) Member A creates a live thread on the post
  const live = await api.functional.econDiscuss.member.posts.live.create(
    connection,
    {
      postId: post.id,
      body: {
        state: "live",
        expertOnly: false,
        accessScope: "public",
        scheduledStartAt: null,
        slowModeIntervalSeconds: null,
      } satisfies IEconDiscussLiveThread.ICreate,
    },
  );
  typia.assert(live);

  // 4) Member A publishes a text message
  const message =
    await api.functional.econDiscuss.member.posts.live.messages.create(
      connection,
      {
        postId: post.id,
        body: {
          messageType: "text",
          content: RandomGenerator.paragraph({ sentences: 12 }),
          pinned: false,
        } satisfies IEconDiscussLiveMessage.ICreate,
      },
    );
  typia.assert(message);

  // Positive path baseline: author successfully updates own message
  const authorUpdate =
    await api.functional.econDiscuss.member.posts.live.messages.update(
      connection,
      {
        postId: post.id,
        messageId: message.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 9 }),
        } satisfies IEconDiscussLiveMessage.IUpdate,
      },
    );
  typia.assert(authorUpdate);
  TestValidator.equals(
    "author update returns same message id",
    authorUpdate.id,
    message.id,
  );
  TestValidator.equals(
    "updated message belongs to same live thread",
    authorUpdate.liveThreadId,
    live.id,
  );
  TestValidator.equals(
    "message type remains 'text' after author update",
    authorUpdate.messageType,
    message.messageType,
  );

  // 5) Member B joins (switch auth) and attempts forbidden update
  const memberBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberB = await api.functional.auth.member.join(connection, {
    body: {
      email: memberBEmail,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
      avatar_uri: undefined,
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(memberB);

  await TestValidator.error(
    "non-author cannot update another user's live message",
    async () => {
      await api.functional.econDiscuss.member.posts.live.messages.update(
        connection,
        {
          postId: post.id,
          messageId: message.id,
          body: {
            content: "unauthorized edit attempt by memberB",
          } satisfies IEconDiscussLiveMessage.IUpdate,
        },
      );
    },
  );
}
