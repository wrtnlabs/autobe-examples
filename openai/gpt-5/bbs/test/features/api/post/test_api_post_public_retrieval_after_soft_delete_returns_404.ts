import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";

export async function test_api_post_public_retrieval_after_soft_delete_returns_404(
  connection: api.IConnection,
) {
  /**
   * Validate public retrieval behavior after soft delete of a post.
   *
   * Steps:
   *
   * 1. Join as a Member (author) to obtain authenticated context
   * 2. Create a post as the authenticated member
   * 3. Update the post with permissible fields (simulate lifecycle without relying
   *    on published_at)
   * 4. Soft delete the post (erase)
   * 5. Attempt public GET by ID with an unauthenticated connection and expect
   *    error
   *
   * Notes:
   *
   * - We intentionally do not assert a specific HTTP status code (e.g., 404); we
   *   only assert that an error occurs.
   * - Publication via published_at is not available in IEconDiscussPost.IUpdate;
   *   we adjust scenario accordingly.
   */

  // 1) Member join (authentication handled by SDK)
  const authorized = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12), // >= 8 chars
      display_name: RandomGenerator.name(),
      timezone: "Asia/Seoul",
      locale: "en-US",
      // avatar_uri optional; omit for simplicity or provide a valid URI
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(authorized);

  // 2) Create a post
  const created = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 15,
        }),
        summary: RandomGenerator.paragraph({ sentences: 8 }),
        // optional scheduled publish; providing now is acceptable though service policy may vary
        scheduled_publish_at: new Date().toISOString(),
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(created);

  // 3) Update permissible fields (no published_at in IUpdate, so adjust scenario)
  const updated = await api.functional.econDiscuss.member.posts.update(
    connection,
    {
      postId: created.id,
      body: {
        title: `${created.title} (edited)`,
        summary: RandomGenerator.paragraph({ sentences: 4 }),
        // adjust schedule to current time to simulate near-term publication changes
        scheduled_publish_at: new Date().toISOString(),
      } satisfies IEconDiscussPost.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "updated post id must equal created post id",
    updated.id,
    created.id,
  );

  // 4) Soft delete the post
  await api.functional.econDiscuss.member.posts.erase(connection, {
    postId: created.id,
  });

  // 5) Public (unauthenticated) retrieval should fail after soft delete
  const publicConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "public GET by id should fail after soft delete",
    async () => {
      await api.functional.econDiscuss.posts.at(publicConn, {
        postId: created.id,
      });
    },
  );
}
