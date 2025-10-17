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
 * Validate that a registered user can retrieve their own bookmark.
 *
 * Flow:
 *
 * 1. Administrator registers and creates a category.
 * 2. Registered user (caller A) registers and becomes authenticated.
 * 3. Caller A creates a thread in the category.
 * 4. Caller A creates a post in the thread.
 * 5. Caller A bookmarks the post.
 * 6. Caller A retrieves the bookmark via GET
 *    /users/{userId}/bookmarks/{bookmarkId}.
 *
 * Assertions:
 *
 * - GET returns a bookmark with matching id, registereduser_id, post_id and
 *   created_at present.
 * - Bookmark.deleted_at is null (soft-delete not set).
 */
export async function test_api_bookmark_retrieval_by_owner(
  connection: api.IConnection,
) {
  // 1. Administrator signs up and becomes authenticated on the connection
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(1),
  } satisfies IEconPoliticalForumAdministrator.IJoin;
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminBody,
    });
  typia.assert(admin);

  // 2. Admin creates a category to host the thread
  const categoryBody = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    slug: RandomGenerator.alphaNumeric(12).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_moderated: false,
    requires_verification: false,
    order: 1,
  } satisfies IEconPoliticalForumCategory.ICreate;
  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // 3. Registered user (caller A) signs up (this will set connection Authorization to the user's token)
  const userBody = {
    username: RandomGenerator.name(1).toLowerCase(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;
  const caller: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: userBody,
    });
  typia.assert(caller);

  // 4. Caller A creates a thread in the created category
  const threadBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 8 }),
    slug: RandomGenerator.alphaNumeric(16).toLowerCase(),
    status: "open",
  } satisfies IEconPoliticalForumThread.ICreate;
  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      { body: threadBody },
    );
  typia.assert(thread);

  // 5. Caller A creates a post in the thread
  const postBody = {
    thread_id: thread.id,
    content: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IEconPoliticalForumPost.ICreate;
  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      { body: postBody },
    );
  typia.assert(post);

  // 6. Caller A bookmarks the post
  const bookmarkBody = {
    post_id: post.id,
  } satisfies IEconPoliticalForumBookmark.ICreate;
  const bookmark: IEconPoliticalForumBookmark =
    await api.functional.econPoliticalForum.registeredUser.bookmarks.create(
      connection,
      { body: bookmarkBody },
    );
  typia.assert(bookmark);

  // 7. Retrieve the bookmark by owner
  const fetched: IEconPoliticalForumBookmark =
    await api.functional.econPoliticalForum.registeredUser.users.bookmarks.at(
      connection,
      {
        userId: caller.id,
        bookmarkId: bookmark.id,
      },
    );
  typia.assert(fetched);

  // Business assertions
  TestValidator.equals(
    "retrieved bookmark id matches",
    fetched.id,
    bookmark.id,
  );
  TestValidator.equals(
    "retrieved bookmark owner matches caller",
    fetched.registereduser_id,
    caller.id,
  );
  TestValidator.equals(
    "retrieved bookmark references post",
    fetched.post_id,
    post.id,
  );
  TestValidator.predicate(
    "retrieved bookmark has created_at",
    fetched.created_at !== null && fetched.created_at !== undefined,
  );
  // Soft-delete should be null for active bookmark
  TestValidator.equals("bookmark not soft-deleted", fetched.deleted_at, null);

  // Teardown note: No public delete API provided in SDK materials. In a
  // real environment, perform cleanup via admin/test utilities or DB
  // fixtures to soft-delete the created bookmark and remove test artifacts.
}
