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
 * Delete live message by its author; verify idempotency and removal from
 * listing.
 *
 * Business purpose
 *
 * - Ensure that a member (author) can remove their own live message from a post’s
 *   live discussion thread.
 * - Verify idempotent behavior: repeated DELETE on the same (postId, messageId)
 *   does not cause error.
 * - Confirm visibility change: the deleted message is no longer listed.
 *
 * Steps
 *
 * 1. Join as a new member (token issued and attached to connection automatically)
 * 2. Create a post as the member
 * 3. Create a live thread for the post (state = "live")
 * 4. Post a text live message; capture message.id
 * 5. List messages for the post and confirm the message is present
 * 6. Delete the message as its author
 * 7. List messages again and confirm absence
 * 8. Delete again to verify idempotency (no error)
 */
export async function test_api_live_message_delete_by_author_idempotent_removed_from_listing(
  connection: api.IConnection,
) {
  // 1) Join as member (userA)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const me = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert(me);

  // 2) Create a post as the member
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IEconDiscussPost.ICreate;
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: postBody,
    },
  );
  typia.assert(post);

  // 3) Create a live thread for the post (state = "live", public access)
  const threadBody = {
    state: "live" as IELiveThreadState,
    accessScope: "public" as IELiveThreadAccessScope,
    expertOnly: false,
  } satisfies IEconDiscussLiveThread.ICreate;
  const thread = await api.functional.econDiscuss.member.posts.live.create(
    connection,
    {
      postId: post.id,
      body: threadBody,
    },
  );
  typia.assert(thread);
  TestValidator.equals(
    "live thread is bound to created post",
    thread.postId,
    post.id,
  );

  // 4) Post a text live message in the thread
  const messageBody = {
    messageType: "text" as IELiveMessageType,
    content: RandomGenerator.paragraph({ sentences: 8 }),
    pinned: false,
  } satisfies IEconDiscussLiveMessage.ICreate;
  const message =
    await api.functional.econDiscuss.member.posts.live.messages.create(
      connection,
      {
        postId: post.id,
        body: messageBody,
      },
    );
  typia.assert(message);

  // 5) List messages and confirm presence
  const beforePage =
    await api.functional.econDiscuss.posts.live.messages.getByPostid(
      connection,
      { postId: post.id },
    );
  typia.assert(beforePage);
  const foundBefore = beforePage.data.find((m) => m.id === message.id);
  TestValidator.predicate(
    "created message appears in listing before deletion",
    foundBefore !== undefined,
  );

  // 6) Delete the message as author
  await api.functional.econDiscuss.member.posts.live.messages.erase(
    connection,
    {
      postId: post.id,
      messageId: message.id,
    },
  );

  // 7) List messages again and confirm absence
  const afterPage =
    await api.functional.econDiscuss.posts.live.messages.getByPostid(
      connection,
      { postId: post.id },
    );
  typia.assert(afterPage);
  const foundAfter = afterPage.data.find((m) => m.id === message.id);
  TestValidator.predicate(
    "deleted message is removed from listing",
    foundAfter === undefined,
  );

  // 8) Delete again to verify idempotency (should not throw)
  await api.functional.econDiscuss.member.posts.live.messages.erase(
    connection,
    {
      postId: post.id,
      messageId: message.id,
    },
  );
}
