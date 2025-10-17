import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumBookmark";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";

/**
 * Validate that a user's bookmark becomes not-found after soft-delete.
 *
 * Business context:
 *
 * - A registered user (caller A) bookmarks a post. When the user deletes the
 *   bookmark (soft-delete), the bookmark must no longer be retrievable via the
 *   public user bookmark GET endpoint. The database row is preserved with
 *   deleted_at populated for audit purposes.
 *
 * Steps:
 *
 * 1. Administrator signs up and creates a category used by the thread.
 * 2. Registered user (caller A) signs up, creates a thread in the category,
 *    creates a post in the thread, and bookmarks the post.
 * 3. Caller A soft-deletes the bookmark via the DELETE endpoint.
 * 4. Caller A attempts to GET the bookmark resource and should receive a not-found
 *    error (validated via TestValidator.error).
 *
 * Notes:
 *
 * - The SDK's join() functions set connection.headers.Authorization to the
 *   returned access token, enabling identity switching by calling join() for
 *   different accounts.
 * - Database-level assertion (checking econ_political_forum_bookmarks.deleted_at)
 *   is not available via the SDK. If the test environment provides DB access,
 *   add an explicit check to verify that deleted_at is set for the bookmarkId.
 */
export async function test_api_bookmark_not_found_after_soft_delete(
  connection: api.IConnection,
) {
  // 1. Administrator signs up and creates a category
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "StrongAdminPass123",
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  const categoryName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const categorySlug = RandomGenerator.alphaNumeric(8).toLowerCase();

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          code: null,
          description: null,
          is_moderated: false,
          requires_verification: false,
          order: 1,
        } satisfies IEconPoliticalForumCategory.ICreate,
      },
    );
  typia.assert(category);

  // 2. Registered user (caller A) signs up
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: userEmail,
        password: "UserPass1234",
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(user);

  // 3. User creates a thread in the category
  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: {
          category_id: category.id,
          title: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 10,
          }),
          slug: RandomGenerator.alphaNumeric(12).toLowerCase(),
          status: "open",
          pinned: false,
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);

  // 4. User creates a post in the thread
  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      {
        body: {
          thread_id: thread.id,
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 10,
            sentenceMax: 20,
          }),
        } satisfies IEconPoliticalForumPost.ICreate,
      },
    );
  typia.assert(post);

  // 5. User bookmarks the post
  const bookmark: IEconPoliticalForumBookmark =
    await api.functional.econPoliticalForum.registeredUser.bookmarks.create(
      connection,
      {
        body: {
          post_id: post.id,
        } satisfies IEconPoliticalForumBookmark.ICreate,
      },
    );
  typia.assert(bookmark);

  // 6. User soft-deletes the bookmark
  await api.functional.econPoliticalForum.registeredUser.bookmarks.erase(
    connection,
    {
      bookmarkId: bookmark.id,
    },
  );

  // 7. After soft-delete, GET should not find the bookmark. Expect an error.
  await TestValidator.error(
    "bookmark not found after soft-delete",
    async () => {
      await api.functional.econPoliticalForum.registeredUser.users.bookmarks.at(
        connection,
        {
          userId: user.id,
          bookmarkId: bookmark.id,
        },
      );
    },
  );

  // 8. DB-level assertion note:
  // If your test environment allows direct DB queries, verify that
  // `econ_political_forum_bookmarks.deleted_at IS NOT NULL` for bookmark.id.
  // Example (pseudo-code, DO NOT RUN here):
  // const row = await db.query('SELECT deleted_at FROM econ_political_forum_bookmarks WHERE id = $1', [bookmark.id]);
  // TestValidator.predicate('bookmark deleted_at set in DB', row.deleted_at !== null);
}
