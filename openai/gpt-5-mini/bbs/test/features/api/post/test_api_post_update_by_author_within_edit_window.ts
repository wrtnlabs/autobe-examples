import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";

export async function test_api_post_update_by_author_within_edit_window(
  connection: api.IConnection,
) {
  /**
   * Validate post update by the original author within the allowed edit window.
   *
   * Business flow implemented (only using available SDK functions):
   *
   * 1. Create administrator account and authenticate.
   * 2. Administrator creates a category.
   * 3. Register a new author account and authenticate as that author.
   * 4. Create a thread in the category as the author.
   * 5. Create a post in the thread as the author.
   * 6. Update the post content as the same author within the edit window.
   * 7. Assert that the update response shows the updated content, that is_edited
   *    is true, and that edited_at is populated.
   *
   * Notes on constraints and omissions:
   *
   * - The provided SDK does NOT include read endpoints for post revisions or
   *   audit logs, nor does it include a delete endpoint for posts.
   *   Consequently, DB-level verification of
   *   econ_political_forum_post_revisions and econ_political_forum_audit_logs
   *   is not possible in this test function. The test therefore validates only
   *   the observable API-level effects returned by the update endpoint (which
   *   is supported by the SDK).
   * - Cleanup must be handled by external test harness (DB reset) because no
   *   delete endpoint is present in the provided SDK.
   */

  // 1) Administrator registration (SDK will set connection.headers.Authorization)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass1234",
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(2),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2) Create a category as administrator
  const categoryBody = {
    name: `test-category-${RandomGenerator.alphaNumeric(6)}`,
    slug: `test-category-${RandomGenerator.alphaNumeric(6)}`.toLowerCase(),
    code: null,
    description: "Category for post update e2e test",
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

  // 3) Author registration (this will switch connection.headers.Authorization to author token)
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const author: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `user_${RandomGenerator.alphaNumeric(6)}`,
        email: authorEmail,
        password: "AuthorPass1234",
        display_name: RandomGenerator.name(2),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(author);

  // 4) Create a thread as the author in the created category
  const threadTitle = RandomGenerator.paragraph({ sentences: 6 });
  let threadSlug = threadTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  if (!threadSlug) threadSlug = `thread-${RandomGenerator.alphaNumeric(6)}`;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: {
          category_id: category.id,
          title: threadTitle,
          slug: threadSlug,
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);

  // 5) Create a post as the author in the created thread
  const initialContent = RandomGenerator.paragraph({ sentences: 12 });
  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      {
        body: {
          thread_id: thread.id,
          content: initialContent,
        } satisfies IEconPoliticalForumPost.ICreate,
      },
    );
  typia.assert(post);

  // 6) Update the post as the same author within the edit window
  const newContent = RandomGenerator.paragraph({ sentences: 8 });
  const updated: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.update(
      connection,
      {
        postId: post.id,
        body: {
          content: newContent,
        } satisfies IEconPoliticalForumPost.IUpdate,
      },
    );
  typia.assert(updated);

  // 7) Validate business outcomes
  TestValidator.equals("post content updated", updated.content, newContent);
  TestValidator.equals(
    "is_edited flag should be true",
    updated.is_edited,
    true,
  );
  TestValidator.predicate(
    "edited_at field populated",
    updated.edited_at !== null && updated.edited_at !== undefined,
  );

  // Teardown note: No delete endpoint provided in SDK; rely on test DB reset/isolated environment.
}
