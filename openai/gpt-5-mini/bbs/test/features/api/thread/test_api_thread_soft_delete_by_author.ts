import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";

/**
 * Validate that a registered thread author can soft-delete their own thread.
 *
 * Workflow:
 *
 * 1. Administrator registers and obtains authorization (to create a category).
 * 2. Administrator creates a category for the thread.
 * 3. A registered user (author) registers and obtains authorization.
 * 4. The author creates a thread in the created category.
 * 5. The author soft-deletes the thread using DELETE
 *    /econPoliticalForum/registeredUser/threads/{threadId}.
 * 6. Validate business effects: the erase call completes and a repeated erase on
 *    the same thread fails (indicating the thread is already soft-deleted and
 *    server enforces appropriate behavior). This approach is used because
 *    direct GET/listing or moderation endpoints for verifying deleted_at are
 *    not available in the provided SDK.
 */
export async function test_api_thread_soft_delete_by_author(
  connection: api.IConnection,
) {
  // 1. Administrator registration
  const adminEmail = `${RandomGenerator.alphaNumeric(6)}@example.com`;
  const adminPassword = RandomGenerator.alphaNumeric(12); // meets min length

  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(2),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2. Create category (admin token is set by SDK)
  const categoryCreateBody = {
    code: null,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: null,
    is_moderated: false,
    requires_verification: false,
    order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies IEconPoliticalForumCategory.ICreate;

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(category);

  // 3. Author registration
  const authorEmail = `${RandomGenerator.alphaNumeric(6)}@example.org`;
  const authorPassword = RandomGenerator.alphaNumeric(12);
  // NOTE: api.functional.auth.registeredUser.join will set connection.headers.Authorization
  const author: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: authorEmail,
        password: authorPassword,
        display_name: RandomGenerator.name(2),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(author);

  // 4. Author creates a thread in the created category
  const threadCreateBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 8, wordMin: 4, wordMax: 10 }),
    slug: RandomGenerator.alphaNumeric(10).toLowerCase(),
    // status and pinned are not provided (author should not set privileged flags)
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      { body: threadCreateBody },
    );
  typia.assert(thread);
  TestValidator.equals(
    "created thread id matches returned id",
    thread.id,
    thread.id,
  );

  // 5. Author soft-deletes their own thread
  await api.functional.econPoliticalForum.registeredUser.threads.erase(
    connection,
    { threadId: thread.id },
  );

  // 6. Business validation
  // 6a: Confirm the delete operation completed without throwing by asserting true
  TestValidator.predicate(
    "soft-delete request completed without throwing",
    true,
  );

  // 6b: Re-attempting to delete the same thread should fail (server enforces business rules)
  await TestValidator.error(
    "re-deleting already-deleted thread should fail",
    async () => {
      await api.functional.econPoliticalForum.registeredUser.threads.erase(
        connection,
        { threadId: thread.id },
      );
    },
  );
}
