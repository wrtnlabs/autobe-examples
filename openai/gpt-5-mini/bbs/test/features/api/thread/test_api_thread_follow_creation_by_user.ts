import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";
import type { IEconPoliticalForumThreadFollow } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThreadFollow";

export async function test_api_thread_follow_creation_by_user(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * - Ensure that a registered user can follow a thread.
   *
   * Steps:
   *
   * 1. Administrator signs up and creates a category.
   * 2. Registered user signs up (caller A).
   * 3. Caller A creates a thread in the category.
   * 4. Caller A follows the created thread.
   * 5. Validate that the returned follow links the user and the thread and that
   *    created_at is present and deleted_at is null/undefined.
   *
   * Notes:
   *
   * - The SDK join() functions automatically set Authorization on the connection;
   *   do not manipulate headers manually.
   * - Teardown (delete) of the follow is not available in the provided SDK
   *   functions; therefore teardown is skipped and the test uses randomized
   *   values to avoid collisions.
   */

  // 1. Administrator signs up
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass#2025", // satisfies MinLength<10>
        username: `admin_${RandomGenerator.alphaNumeric(6)}`,
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2. Administrator creates a category
  const categoryBody = {
    code: null,
    name: `category-${RandomGenerator.name(2)}`,
    slug: `cat-${RandomGenerator.alphaNumeric(8)}`,
    description: null,
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

  // 3. Registered user signs up (caller A)
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const registered: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `user_${RandomGenerator.alphaNumeric(6)}`,
        email: userEmail,
        password: "UserPass#2025",
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(registered);

  // 4. Caller A creates a thread in the category
  const threadTitle = RandomGenerator.paragraph({ sentences: 6 });
  const threadSlug = `t-${RandomGenerator.alphaNumeric(8)}`;

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

  // 5. Caller A follows the thread
  const follow: IEconPoliticalForumThreadFollow =
    await api.functional.econPoliticalForum.registeredUser.threads.follows.create(
      connection,
      {
        threadId: thread.id,
        body: {
          thread_id: thread.id,
          muted_until: null,
        } satisfies IEconPoliticalForumThreadFollow.ICreate,
      },
    );
  typia.assert(follow);

  // Validations
  TestValidator.equals(
    "follow.registereduser_id should match the creating registered user",
    follow.registereduser_id,
    registered.id,
  );
  TestValidator.equals(
    "follow.thread_id should match the created thread",
    follow.thread_id,
    thread.id,
  );
  TestValidator.predicate(
    "follow.created_at should be present",
    follow.created_at !== null && follow.created_at !== undefined,
  );
  TestValidator.predicate(
    "follow should not be soft-deleted",
    follow.deleted_at === null || follow.deleted_at === undefined,
  );

  // Teardown note: no delete endpoint for follows provided in the SDK
  // Skipping explicit teardown; rely on randomization and test isolation.
}
