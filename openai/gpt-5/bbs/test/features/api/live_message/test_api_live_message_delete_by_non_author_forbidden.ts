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
 * Verify non-author cannot delete another member's live message in a post's
 * live thread.
 *
 * Steps:
 *
 * 1. Join as userA. Create a post, then create a live thread for that post (userA
 *    is host).
 * 2. As userA, create a live message and record its messageId.
 * 3. Join as a different member userB (SDK switches Authorization automatically).
 * 4. Attempt to delete userA's message as userB and expect an error.
 *
 * Business validations:
 *
 * - A non-author, non-host must not be able to delete someone else’s live
 *   message.
 * - Do not assert specific HTTP status codes; only assert that an error occurs.
 */
export async function test_api_live_message_delete_by_non_author_forbidden(
  connection: api.IConnection,
) {
  // 1) Authenticate as userA (member)
  const userAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const userAPassword: string = RandomGenerator.alphaNumeric(12);
  const authA: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: userAEmail,
        password: userAPassword,
        display_name: RandomGenerator.name(1),
        timezone: "Asia/Seoul",
        locale: "en-US",
      } satisfies IEconDiscussMember.ICreate,
    });
  typia.assert(authA);

  // 2) As userA, create a post for the live thread
  const createPostBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IEconDiscussPost.ICreate;
  const post: IEconDiscussPost =
    await api.functional.econDiscuss.member.posts.create(connection, {
      body: createPostBody,
    });
  typia.assert(post);

  // Create a live thread under the post (userA is host)
  const createThreadBody = {
    state: "live" as IELiveThreadState,
    expertOnly: false,
    accessScope: "public" as IELiveThreadAccessScope,
    scheduledStartAt: new Date().toISOString(),
  } satisfies IEconDiscussLiveThread.ICreate;
  const thread: IEconDiscussLiveThread =
    await api.functional.econDiscuss.member.posts.live.create(connection, {
      postId: post.id,
      body: createThreadBody,
    });
  typia.assert(thread);

  // Create a live message owned by userA
  const createMessageBody = {
    messageType: "text" as IELiveMessageType,
    content: RandomGenerator.paragraph({ sentences: 8 }),
    pinned: false,
  } satisfies IEconDiscussLiveMessage.ICreate;
  const message: IEconDiscussLiveMessage =
    await api.functional.econDiscuss.member.posts.live.messages.create(
      connection,
      { postId: post.id, body: createMessageBody },
    );
  typia.assert(message);

  // 3) Authenticate as userB (different member)
  const userBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const userBPassword: string = RandomGenerator.alphaNumeric(12);
  const authB: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: userBEmail,
        password: userBPassword,
        display_name: RandomGenerator.name(1),
        timezone: "Asia/Seoul",
        locale: "en-US",
      } satisfies IEconDiscussMember.ICreate,
    });
  typia.assert(authB);

  // 4) Attempt to delete userA's message as userB -> expect an error
  await TestValidator.error(
    "non-author cannot delete another user's live message",
    async () => {
      await api.functional.econDiscuss.member.posts.live.messages.erase(
        connection,
        { postId: post.id, messageId: message.id },
      );
    },
  );
}
