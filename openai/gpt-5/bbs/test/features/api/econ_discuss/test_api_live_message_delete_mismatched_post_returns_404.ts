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
 * Ensure deletion of a live message with a mismatched postId fails.
 *
 * Business context:
 *
 * - A live message is strictly bound to the live thread of its owning post.
 * - Deleting a message must be scoped by the correct postId → live thread →
 *   message chain.
 * - When a client attempts to delete a message using a different post’s postId,
 *   the operation must fail. We validate failure occurs (without asserting a
 *   specific status code) per testing constraints.
 *
 * Steps:
 *
 * 1. Join as a member (userA) so subsequent calls are authenticated.
 * 2. Create Post A.
 * 3. Create Thread A for Post A (state=live, public).
 * 4. Create Message A under Post A’s thread.
 * 5. Create Post B.
 * 6. Create Thread B for Post B (state=live, public) to ensure both contexts are
 *    valid.
 * 7. Attempt to delete Message A using Post B’s postId and verify the operation
 *    fails.
 */
export async function test_api_live_message_delete_mismatched_post_returns_404(
  connection: api.IConnection,
) {
  // 1) Authenticate (join) as member userA
  const memberAuth: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12), // >= 8
        display_name: RandomGenerator.name(2),
        timezone: "Asia/Seoul",
        locale: "en-US",
      } satisfies IEconDiscussMember.ICreate,
    });
  typia.assert(memberAuth);

  // 2) Create Post A
  const postA: IEconDiscussPost =
    await api.functional.econDiscuss.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IEconDiscussPost.ICreate,
    });
  typia.assert(postA);

  // 3) Create Thread A (state=live, public)
  const threadA: IEconDiscussLiveThread =
    await api.functional.econDiscuss.member.posts.live.create(connection, {
      postId: postA.id,
      body: {
        state: "live",
        expertOnly: false,
        accessScope: "public",
        slowModeIntervalSeconds: 5,
      } satisfies IEconDiscussLiveThread.ICreate,
    });
  typia.assert(threadA);
  TestValidator.equals("thread A binds to post A", threadA.postId, postA.id);

  // 4) Create Message A under Post A’s thread
  const messageA: IEconDiscussLiveMessage =
    await api.functional.econDiscuss.member.posts.live.messages.create(
      connection,
      {
        postId: postA.id,
        body: {
          messageType: "text",
          content: RandomGenerator.paragraph({ sentences: 6 }),
          pinned: false,
        } satisfies IEconDiscussLiveMessage.ICreate,
      },
    );
  typia.assert(messageA);
  TestValidator.equals(
    "message A belongs to thread A",
    messageA.liveThreadId,
    threadA.id,
  );

  // 5) Create Post B
  const postB: IEconDiscussPost =
    await api.functional.econDiscuss.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 4 }),
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IEconDiscussPost.ICreate,
    });
  typia.assert(postB);
  TestValidator.notEquals("post B is distinct from post A", postB.id, postA.id);

  // 6) Create Thread B to ensure a valid live context also exists for post B
  const threadB: IEconDiscussLiveThread =
    await api.functional.econDiscuss.member.posts.live.create(connection, {
      postId: postB.id,
      body: {
        state: "live",
        expertOnly: false,
        accessScope: "public",
        slowModeIntervalSeconds: 3,
      } satisfies IEconDiscussLiveThread.ICreate,
    });
  typia.assert(threadB);
  TestValidator.equals("thread B binds to post B", threadB.postId, postB.id);

  // 7) Attempt to delete Message A via postId=postB.id (mismatched context) → must fail
  await TestValidator.error(
    "deleting message A using post B's postId should fail",
    async () => {
      await api.functional.econDiscuss.member.posts.live.messages.erase(
        connection,
        {
          postId: postB.id,
          messageId: messageA.id,
        },
      );
    },
  );
}
