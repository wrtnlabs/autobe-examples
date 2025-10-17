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

export async function test_api_bookmark_soft_delete_by_owner_success(
  connection: api.IConnection,
) {
  // 1. Administrator signup to create a category
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "P@ssword12345",
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(2),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "admin has access token",
    () => typeof admin.token?.access === "string",
  );

  // 2. Create a category with admin credentials
  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: {
          code: null,
          name: `cat-${RandomGenerator.alphaNumeric(6)}`,
          slug: `cat-${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 6 }),
          is_moderated: false,
          requires_verification: false,
          order: 1,
        } satisfies IEconPoliticalForumCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Registered user (owner) signup
  const owner: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `user_${RandomGenerator.alphaNumeric(6)}`,
        email: typia.random<string & tags.Format<"email">>(),
        password: "P@ssword12345",
        display_name: RandomGenerator.name(2),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(owner);
  TestValidator.predicate(
    "owner has access token",
    () => typeof owner.token?.access === "string",
  );

  // 4. Create a thread in the category as the owner
  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: {
          category_id: category.id,
          title: RandomGenerator.paragraph({ sentences: 5 }),
          slug: `t-${RandomGenerator.alphaNumeric(8)}`,
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);
  TestValidator.equals(
    "thread belongs to category",
    thread.category_id,
    category.id,
  );

  // 5. Create a post inside the thread as the owner
  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      {
        body: {
          thread_id: thread.id,
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 12,
            sentenceMax: 16,
          }),
        } satisfies IEconPoliticalForumPost.ICreate,
      },
    );
  typia.assert(post);
  TestValidator.equals("post belongs to thread", post.thread_id, thread.id);

  // 6. Create a bookmark for the post as the owner
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
  TestValidator.equals("bookmark references post", bookmark.post_id, post.id);

  // 7. Erase (soft-delete) the bookmark by its owner. Expected: success (void/204)
  await api.functional.econPoliticalForum.registeredUser.bookmarks.erase(
    connection,
    {
      bookmarkId: bookmark.id,
    },
  );

  // 8. Validation: Attempting to erase again should fail (resource no longer available)
  await TestValidator.error(
    "deleting already deleted bookmark should fail",
    async () => {
      await api.functional.econPoliticalForum.registeredUser.bookmarks.erase(
        connection,
        {
          bookmarkId: bookmark.id,
        },
      );
    },
  );
}
