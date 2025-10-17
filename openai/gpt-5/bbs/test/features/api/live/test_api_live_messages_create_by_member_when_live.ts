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

export async function test_api_live_messages_create_by_member_when_live(
  connection: api.IConnection,
) {
  /**
   * Validate live text message creation by an authenticated member.
   *
   * Steps:
   *
   * 1. Join as a member to obtain authentication context
   * 2. Create a post as the authenticated member
   * 3. Create a live thread for the post in state="live"
   * 4. Create a text message within the live thread (pinned omitted -> defaults
   *    false)
   * 5. Validate linkages and attributes (author, thread, type, content, pinned)
   */

  // 1) Join as a member
  const authorized = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12), // >= 8 chars
      display_name: RandomGenerator.name(2),
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
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        summary: null,
        // scheduled_publish_at, topicIds omitted intentionally
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(post);

  // 3) Create a live thread in permissible state
  const liveThread = await api.functional.econDiscuss.member.posts.live.create(
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
  typia.assert(liveThread);

  // Thread ↔ Post linkage and host ownership
  TestValidator.equals(
    "live thread bound to the created post",
    liveThread.postId,
    post.id,
  );
  TestValidator.equals(
    "live thread host equals the authenticated member",
    liveThread.hostUserId,
    authorized.id,
  );
  TestValidator.equals("live thread state is 'live'", liveThread.state, "live");

  // 4) Create a text message in the live thread
  const content = RandomGenerator.paragraph({ sentences: 8 });
  const message =
    await api.functional.econDiscuss.member.posts.live.messages.create(
      connection,
      {
        postId: post.id,
        body: {
          messageType: "text",
          content,
          // pinned intentionally omitted to validate default=false
        } satisfies IEconDiscussLiveMessage.ICreate,
      },
    );
  typia.assert(message);

  // 5) Validate message linkages and attributes
  TestValidator.equals(
    "message is linked to the live thread",
    message.liveThreadId,
    liveThread.id,
  );
  TestValidator.equals("messageType is 'text'", message.messageType, "text");
  TestValidator.equals(
    "message content echoes input",
    message.content,
    content,
  );
  TestValidator.equals(
    "pinned defaults to false when omitted",
    message.pinned,
    false,
  );

  // Author linkage may be present via authorUserId or embedded author summary
  const authoredByMember: boolean =
    (message.authorUserId !== null &&
      message.authorUserId !== undefined &&
      message.authorUserId === authorized.id) ||
    (message.author !== null &&
      message.author !== undefined &&
      message.author.id === authorized.id);
  TestValidator.predicate(
    "author linkage matches authenticated member",
    authoredByMember,
  );
}
