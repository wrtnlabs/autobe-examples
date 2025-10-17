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
 * Validate slow mode rate limiting for live discussion messages.
 *
 * Scenario
 *
 * 1. Register a member (auth token applied to connection automatically by SDK).
 * 2. Create a post to host the live session.
 * 3. Create a live thread in "live" state with slowModeIntervalSeconds > 0.
 * 4. Send the first text message → success.
 * 5. Immediately send the second text message → expect an error due to slow mode.
 * 6. Wait for the slow mode window to elapse.
 * 7. Send the third text message → success.
 *
 * Validations
 *
 * - Typia.assert() on all non-void responses.
 * - Business consistency checks:
 *
 *   - Post.author_user_id equals the joined member id.
 *   - LiveThread.postId equals the created post id.
 *   - LiveThread.slowModeIntervalSeconds equals configured seconds.
 *   - Message.liveThreadId equals the created live thread id.
 */
export async function test_api_live_messages_create_slow_mode_rate_limit(
  connection: api.IConnection,
) {
  // 1) Register a member
  const auth = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(auth);

  // 2) Create a post to host the live session
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 6,
          sentenceMax: 12,
        }),
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(post);
  TestValidator.equals(
    "post author should match joined member",
    post.author_user_id,
    auth.id,
  );

  // 3) Create a live thread in live state with slow mode enabled
  const slowSeconds = 2;
  const live = await api.functional.econDiscuss.member.posts.live.create(
    connection,
    {
      postId: post.id,
      body: {
        state: "live",
        expertOnly: false,
        accessScope: "public",
        slowModeIntervalSeconds: slowSeconds satisfies number as number,
      } satisfies IEconDiscussLiveThread.ICreate,
    },
  );
  typia.assert(live);
  TestValidator.equals(
    "live thread should reference the created post",
    live.postId,
    post.id,
  );
  TestValidator.equals(
    "slow mode interval should match configured seconds",
    live.slowModeIntervalSeconds,
    slowSeconds,
  );

  // 4) First message: success
  const first =
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
  typia.assert(first);
  TestValidator.equals(
    "first message belongs to the live thread",
    first.liveThreadId,
    live.id,
  );

  // 5) Immediate second message: should be rate-limited by slow mode
  await TestValidator.error(
    "second message immediately should be rate-limited by slow mode",
    async () => {
      await api.functional.econDiscuss.member.posts.live.messages.create(
        connection,
        {
          postId: post.id,
          body: {
            messageType: "text",
            content: RandomGenerator.paragraph({ sentences: 6 }),
          } satisfies IEconDiscussLiveMessage.ICreate,
        },
      );
    },
  );

  // 6) Wait for slow mode window (slowSeconds + small buffer)
  await new Promise<void>((resolve) =>
    setTimeout(resolve, (slowSeconds + 1) * 1000),
  );

  // 7) Third message after waiting: success
  const third =
    await api.functional.econDiscuss.member.posts.live.messages.create(
      connection,
      {
        postId: post.id,
        body: {
          messageType: "text",
          content: RandomGenerator.paragraph({ sentences: 7 }),
        } satisfies IEconDiscussLiveMessage.ICreate,
      },
    );
  typia.assert(third);
  TestValidator.equals(
    "third message belongs to the live thread",
    third.liveThreadId,
    live.id,
  );
}
