import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";

export async function test_api_post_delete_unauthenticated_rejected_401(
  connection: api.IConnection,
) {
  /**
   * Validate that unauthenticated DELETE /econDiscuss/member/posts/{postId} is
   * rejected by the server.
   *
   * Steps
   *
   * 1. Register a member (join) which also authenticates the SDK connection
   * 2. Create a post as the authenticated member
   * 3. Create an unauthenticated connection (headers: {})
   * 4. Attempt to delete the post without auth and expect an error
   *
   * Notes
   *
   * - We do not validate specific HTTP status codes (401, 403, etc.) in tests, as
   *   status-code assertions are prohibited. We only assert that an error
   *   occurs for the unauthenticated attempt.
   * - All non-void responses are validated with typia.assert().
   * - Do not mutate connection.headers; instead, construct a fresh connection
   *   object for unauthenticated requests.
   */

  // 1) Register a member (join) - SDK will set Authorization header automatically
  const auth = await api.functional.auth.member.join(connection, {
    body: typia.random<IEconDiscussMember.ICreate>(),
  });
  typia.assert(auth);

  // 2) Create a post as the authenticated member
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 5 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 12,
    }),
  } satisfies IEconDiscussPost.ICreate;
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: createBody,
    },
  );
  typia.assert(post);

  // Business sanity check: post.author_user_id matches authenticated member id
  TestValidator.equals(
    "post author id equals authenticated member id",
    post.author_user_id,
    auth.id,
  );

  // 3) Create an unauthenticated connection (do NOT touch original headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 4) Attempt to delete without Authorization -> must fail (no status code assertion)
  await TestValidator.error(
    "unauthenticated delete attempt must be rejected",
    async () => {
      await api.functional.econDiscuss.member.posts.erase(unauthConn, {
        postId: post.id,
      });
    },
  );
}
