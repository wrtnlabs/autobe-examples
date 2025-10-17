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

/**
 * Validate soft-delete (archive) of a post by its author.
 *
 * Business context:
 *
 * - An administrator must first create a category to host the thread.
 * - A registered user (author) then creates a thread and a post inside it.
 * - Another registered user (other) must NOT be able to delete the author's post.
 * - The author must be able to soft-delete their own post via DELETE
 *   /econPoliticalForum/registeredUser/posts/{postId}.
 *
 * Limitations:
 *
 * - The provided SDK does not include read/list/audit endpoints; therefore direct
 *   verification of deleted_at or audit logs is not possible via SDK. This test
 *   verifies deletion behavior via successful/failed API calls and sequence
 *   invariants that are available.
 */
export async function test_api_post_soft_delete_by_author(
  connection: api.IConnection,
) {
  // 1) Prepare isolated connections per identity
  const adminConn: api.IConnection = { ...connection, headers: {} };
  const authorConn: api.IConnection = { ...connection, headers: {} };
  const otherConn: api.IConnection = { ...connection, headers: {} };

  // 2) Administrator signs up (creates admin account and receives token)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(adminConn, {
      body: {
        email: adminEmail,
        password: `Admin!${RandomGenerator.alphaNumeric(8)}`,
        username: `admin_${RandomGenerator.alphaNumeric(6)}`,
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 3) Admin creates category
  const categoryName = `test-category-${RandomGenerator.alphaNumeric(6)}`;
  const categorySlug =
    `test-category-${RandomGenerator.alphaNumeric(6)}`.toLowerCase();
  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      adminConn,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          description: null,
          code: null,
          is_moderated: false,
          requires_verification: false,
          order: 1,
        } satisfies IEconPoliticalForumCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4) Author registers
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorUsername = `author_${RandomGenerator.alphaNumeric(6)}`;
  const author: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(authorConn, {
      body: {
        username: authorUsername,
        email: authorEmail,
        password: `Author!${RandomGenerator.alphaNumeric(8)}`,
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(author);

  // 5) Author creates a thread in the created category
  const threadTitle = RandomGenerator.paragraph({ sentences: 6 });
  const threadSlug = `t-${RandomGenerator.alphaNumeric(8)}`.toLowerCase();
  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      authorConn,
      {
        body: {
          category_id: category.id,
          title: threadTitle,
          slug: threadSlug,
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);

  // 6) Author creates a post in the thread
  const postContent = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 8,
    sentenceMax: 12,
  });
  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      authorConn,
      {
        body: {
          thread_id: thread.id,
          content: postContent,
        } satisfies IEconPoliticalForumPost.ICreate,
      },
    );
  typia.assert(post);

  // Validate that post references the correct thread
  TestValidator.equals(
    "post references created thread",
    post.thread_id,
    thread.id,
  );

  // 7) Another registered user attempts to delete the author's post and must fail
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const otherUsername = `other_${RandomGenerator.alphaNumeric(6)}`;
  const other: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(otherConn, {
      body: {
        username: otherUsername,
        email: otherEmail,
        password: `Other!${RandomGenerator.alphaNumeric(8)}`,
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(other);

  // Non-author deletion must throw (authorization enforcement). Use TestValidator.error with await.
  await TestValidator.error(
    "non-author cannot delete another user's post",
    async () => {
      await api.functional.econPoliticalForum.registeredUser.posts.erase(
        otherConn,
        {
          postId: post.id,
        },
      );
    },
  );

  // 8) Author deletes their post (should succeed without throwing)
  await api.functional.econPoliticalForum.registeredUser.posts.erase(
    authorConn,
    {
      postId: post.id,
    },
  );

  // Author delete succeeded if no exception was thrown; record simple predicate
  TestValidator.predicate("author delete completed without exception", true);

  // Notes & recommendations (logged as predicates to keep assertions in test flow)
  TestValidator.predicate(
    "note - DB-level deleted_at and audit log validation requires admin/read endpoints",
    true,
  );
}
