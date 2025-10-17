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
 * Validate that a registered user can create a top-level post in a public
 * category and that the created post contains the expected fields and
 * side-effects (record persisted with created_at, not edited, not hidden).
 *
 * Steps:
 *
 * 1. Administrator registers (creates an admin account) and obtains auth.
 * 2. Administrator creates a category with is_moderated=false and
 *    requires_verification=false.
 * 3. A new registered user joins and obtains auth.
 * 4. Registered user creates a thread in the category.
 * 5. Registered user creates a top-level post in the thread.
 * 6. Assert response fields and basic side-effects (created_at present,
 *    is_edited=false, edited_at null/undefined, is_hidden=false).
 * 7. Create a second quick post to demonstrate repeated posting within normal rate
 *    limits succeeds.
 *
 * Notes:
 *
 * - This test uses only the provided SDK functions.
 * - It never touches connection.headers directly (SDK manages tokens).
 * - It uses `satisfies` for request bodies to guarantee compile-time type
 *   compatibility.
 */
export async function test_api_post_creation_by_registered_user(
  connection: api.IConnection,
) {
  // 1. Administrator registration (will set connection.headers.Authorization)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: `admin_${RandomGenerator.alphaNumeric(6)}`,
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2. Administrator creates a public category (no moderation, no verification)
  const categoryBody = {
    name: `test-category-${RandomGenerator.alphaNumeric(4)}`,
    slug: `test-cat-${RandomGenerator.alphabets(6)}`,
    description: "E2E test category: public, non-moderated",
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
  TestValidator.equals(
    "created category name matches request",
    category.name,
    categoryBody.name,
  );
  TestValidator.equals(
    "created category moderation flag is false",
    category.is_moderated,
    false,
  );
  TestValidator.equals(
    "created category requires_verification is false",
    category.requires_verification,
    false,
  );

  // 3. Create a fresh registered user (SDK will set connection.headers to this user)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "P@ssw0rd1234"; // valid, sufficiently long
  const userName = `user_${RandomGenerator.alphaNumeric(6)}`;

  const user: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: userName,
        email: userEmail,
        password: userPassword,
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(user);

  // 4. Registered user creates a thread in the test category
  const threadBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 3, wordMax: 8 }),
    slug: RandomGenerator.alphabets(6),
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      { body: threadBody },
    );
  typia.assert(thread);
  TestValidator.equals(
    "thread.category_id matches",
    thread.category_id,
    category.id,
  );

  // 5. Registered user creates a top-level post in the thread
  const postBody = {
    thread_id: thread.id,
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 15,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IEconPoliticalForumPost.ICreate;

  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      { body: postBody },
    );
  typia.assert(post);

  // Business-level assertions
  TestValidator.equals(
    "post.thread_id matches thread.id",
    post.thread_id,
    thread.id,
  );
  TestValidator.equals(
    "post.author_id matches created user id",
    post.author_id,
    user.id,
  );
  TestValidator.equals(
    "post.content matches request",
    post.content,
    postBody.content,
  );
  TestValidator.equals("post is not edited", post.is_edited, false);
  TestValidator.predicate(
    "post has created_at",
    typeof post.created_at === "string",
  );
  TestValidator.equals(
    "post is not hidden by moderator",
    post.is_hidden,
    false,
  );

  // 6. Quick consecutive post to show repeated posts within normal limits succeed
  const postBody2 = {
    thread_id: thread.id,
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 8,
      sentenceMax: 12,
      wordMin: 3,
      wordMax: 7,
    }),
  } satisfies IEconPoliticalForumPost.ICreate;

  const post2: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      { body: postBody2 },
    );
  typia.assert(post2);
  TestValidator.equals(
    "second post.thread_id matches thread.id",
    post2.thread_id,
    thread.id,
  );
  TestValidator.equals(
    "second post.author_id matches created user id",
    post2.author_id,
    user.id,
  );

  // NOTE: Database-level verification (e.g., checking deleted_at is null or
  // audit log / job queue side-effects) should be performed by environment
  // hooks or DB queries available in the test harness. This E2E test verifies
  // the API responses and basic business expectations using the SDK only.
}
