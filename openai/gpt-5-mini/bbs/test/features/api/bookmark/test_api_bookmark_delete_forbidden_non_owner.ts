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
 * Validate that a registered user who does NOT own a bookmark cannot delete it.
 *
 * Workflow:
 *
 * 1. Create an administrator account and, using that admin, create a category.
 * 2. Register an owner user; using the owner's context create a thread and a post
 *    and then create a bookmark for that post.
 * 3. Register a second (other) user and, using that other user's credentials,
 *    attempt to delete the owner's bookmark and expect an error.
 * 4. Finally, verify ownership semantics by deleting the bookmark with the
 *    original owner credentials (should succeed).
 *
 * Notes:
 *
 * - The SDK does not provide a bookmark-listing endpoint among the provided
 *   functions, so the test verifies ownership by ensuring the non-owner's
 *   delete fails and the owner can delete successfully.
 * - All request bodies use `satisfies` with the exact DTO types. All non-void
 *   responses are validated with `typia.assert()`.
 */
export async function test_api_bookmark_delete_forbidden_non_owner(
  connection: api.IConnection,
) {
  // 1) Administrator registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(1),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2) Admin creates a category
  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
          is_moderated: false,
          requires_verification: false,
          order: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        } satisfies IEconPoliticalForumCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3) Owner registration (will set the connection's auth token to owner)
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerPassword = RandomGenerator.alphaNumeric(12);
  const ownerUsername = RandomGenerator.alphaNumeric(8);
  const owner: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: ownerUsername,
        email: ownerEmail,
        password: ownerPassword,
        display_name: RandomGenerator.name(1),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(owner);

  // 4) Owner creates a thread in the category
  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: {
          category_id: category.id,
          title: RandomGenerator.paragraph({ sentences: 6 }),
          slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);

  // 5) Owner creates a post inside the thread
  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      {
        body: {
          thread_id: thread.id,
          content: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IEconPoliticalForumPost.ICreate,
      },
    );
  typia.assert(post);

  // 6) Owner creates a bookmark for the post
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

  // Keep owner token for later (join returned it)
  const ownerToken: IAuthorizationToken = owner.token;

  // 7) Create a second registered user (other user)
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const otherPassword = RandomGenerator.alphaNumeric(12);
  const otherUsername = RandomGenerator.alphaNumeric(8);
  const other: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: otherUsername,
        email: otherEmail,
        password: otherPassword,
        display_name: RandomGenerator.name(1),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(other);

  // 8) Attempt deletion with other user's credentials: expect an error
  const otherConn: api.IConnection = {
    ...connection,
    headers: { Authorization: other.token.access },
  };
  await TestValidator.error("non-owner cannot delete bookmark", async () => {
    await api.functional.econPoliticalForum.registeredUser.bookmarks.erase(
      otherConn,
      {
        bookmarkId: bookmark.id,
      },
    );
  });

  // 9) Verify owner can delete the bookmark (ownership enforcement):
  // Create a connection authenticated as owner using the captured token.
  const ownerConn: api.IConnection = {
    ...connection,
    headers: { Authorization: ownerToken.access },
  };
  // Owner should be able to erase the bookmark without throwing an error.
  await api.functional.econPoliticalForum.registeredUser.bookmarks.erase(
    ownerConn,
    {
      bookmarkId: bookmark.id,
    },
  );

  // Final business assertion: owner deletion succeeded (no error thrown)
  TestValidator.predicate("owner deletion succeeded", true);
}
