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
 * Verify error when fetching live messages for a post without a live thread.
 *
 * Steps:
 *
 * 1. Register a member (join) to obtain authentication.
 * 2. Create a post as the authenticated member.
 * 3. Prepare an unauthenticated connection (headers: {}).
 * 4. Call GET /econDiscuss/posts/{postId}/live/messages anonymously.
 * 5. Expect an error because the post has no live thread.
 *
 * Notes:
 *
 * - Do not assert specific HTTP status codes; only verify an error occurs.
 * - Validate response types for successful steps using typia.assert().
 */
export async function test_api_live_messages_public_timeline_not_found_without_thread(
  connection: api.IConnection,
) {
  // 1) Register a member (join) for authentication
  const authorized = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(1),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert<IEconDiscussMember.IAuthorized>(authorized);

  // 2) Create a post as the authenticated member
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 6 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert<IEconDiscussPost>(post);

  // Business validation: author of the post must match authenticated user id
  TestValidator.equals(
    "post author should match authenticated member id",
    post.author_user_id,
    authorized.id,
  );

  // 3) Create an unauthenticated connection for public access attempt
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 4) Attempt to fetch live messages without any live thread created
  // 5) Expect an error (do not check status code)
  await TestValidator.error(
    "live messages listing should fail when no live thread exists",
    async () => {
      await api.functional.econDiscuss.posts.live.messages.getByPostid(
        unauthConn,
        { postId: post.id },
      );
    },
  );
}
