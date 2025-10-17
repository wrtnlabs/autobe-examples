import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IELiveMessageType } from "@ORGANIZATION/PROJECT-api/lib/structures/IELiveMessageType";
import type { IEconDiscussLiveMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussLiveMessage";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";
import type { IEconDiscussUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussLiveMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussLiveMessage";

/**
 * Live messages listing fails when post has no live thread.
 *
 * Steps:
 *
 * 1. Register a member (SDK sets Authorization automatically).
 * 2. Create a post as that member (do NOT create any live thread).
 * 3. Attempt to list live messages for the post.
 * 4. Expect an error because the post has no associated live thread.
 *
 * Notes:
 *
 * - Per policy, do not assert specific HTTP status codes. Validate only that an
 *   error occurs.
 * - Validate successful setup responses with typia.assert(), and confirm the post
 *   author matches the member id.
 */
export async function test_api_live_messages_404_when_no_thread_exists(
  connection: api.IConnection,
) {
  // 1) Register a member
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(member);

  // 2) Create a post as the authenticated member (no live thread creation)
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        summary: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(post);

  // Business invariant: post belongs to the authenticated member
  TestValidator.equals(
    "created post author should match authenticated member id",
    post.author_user_id,
    member.id,
  );

  // 3) Attempt to list live messages for the post without a live thread
  // 4) Expect an error (no status code assertion per policy)
  await TestValidator.error(
    "listing live messages without an existing live thread should fail",
    async () => {
      await api.functional.econDiscuss.posts.live.messages.patchByPostid(
        connection,
        {
          postId: post.id,
          body: {} satisfies IEconDiscussLiveMessage.IRequest,
        },
      );
    },
  );
}
