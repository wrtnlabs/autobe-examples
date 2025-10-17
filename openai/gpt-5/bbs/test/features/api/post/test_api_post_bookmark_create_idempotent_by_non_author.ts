import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";
import type { IEconDiscussPostBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostBookmark";

/**
 * Ensure a non-author member can bookmark a post and repeated creations are
 * idempotent.
 *
 * Business context:
 *
 * - Members can save posts as personal bookmarks. A unique (user, post)
 *   constraint guarantees idempotent behavior. The API returns void on success
 *   and may respond with 204/200 depending on implementation details.
 * - Authentication is required; unauthenticated requests must be rejected by the
 *   server.
 *
 * Steps:
 *
 * 1. Join as an author and create a post.
 * 2. Join as a different member (bookmarker) and create a bookmark for the post.
 * 3. Call the same bookmark creation again to confirm idempotency (no duplicates
 *    and no errors).
 * 4. Negative: attempt bookmark creation without Authorization and expect an
 *    error.
 */
export async function test_api_post_bookmark_create_idempotent_by_non_author(
  connection: api.IConnection,
) {
  // 1) Author joins
  const authorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const authorAuth = await api.functional.auth.member.join(connection, {
    body: {
      email: authorEmail,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(authorAuth);

  // 1-b) Author creates a post
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(post);

  // Validate author → post linkage
  TestValidator.equals(
    "post's author_user_id equals author's id",
    post.author_user_id,
    authorAuth.id,
  );

  // 2) Bookmarker (non-author) joins (switches auth in the shared connection)
  const bookmarkerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const bookmarkerAuth = await api.functional.auth.member.join(connection, {
    body: {
      email: bookmarkerEmail,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(bookmarkerAuth);

  // 3) First bookmark creation
  await api.functional.econDiscuss.member.posts.bookmarks.create(connection, {
    postId: post.id,
    body: {
      note: RandomGenerator.paragraph({ sentences: 8 }),
    } satisfies IEconDiscussPostBookmark.ICreate,
  });

  // 3-b) Repeat to confirm idempotency (should be a no-op w/o error)
  await api.functional.econDiscuss.member.posts.bookmarks.create(connection, {
    postId: post.id,
    body: {} satisfies IEconDiscussPostBookmark.ICreate,
  });

  // 4) Negative: unauthenticated request should error
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated request must be rejected",
    async () => {
      await api.functional.econDiscuss.member.posts.bookmarks.create(
        unauthConnection,
        {
          postId: post.id,
          body: {
            note: RandomGenerator.paragraph({ sentences: 4 }),
          } satisfies IEconDiscussPostBookmark.ICreate,
        },
      );
    },
  );
}
