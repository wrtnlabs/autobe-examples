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
 * Validate that a non-author registered user cannot update thread metadata.
 *
 * Business context:
 *
 * - Only the thread author (or privileged roles like moderators/admins) may
 *   update a thread's mutable metadata (title, slug, status, pinned).
 * - This test creates the necessary resources (admin-created category, author
 *   account, thread) and then creates a second registered user who attempts to
 *   update the thread. The update must fail with a runtime error (for example,
 *   403 Forbidden or 404 to avoid leaking existence).
 *
 * Steps:
 *
 * 1. Administrator registration (admin token auto-attached to connection)
 * 2. Create a category as administrator
 * 3. Register an author account and create a thread in that category
 * 4. Register a second (non-author) user
 * 5. Attempt to update the thread as the non-author user and assert that an error
 *    is thrown
 *
 * Limitations: The provided SDK does not include a GET thread endpoint. The
 * test therefore captures the create response for original values and asserts
 * that the update call fails. Full DB-level verification should be done by the
 * test harness (DB reset/inspection) if needed.
 */
export async function test_api_thread_update_forbidden_by_non_author(
  connection: api.IConnection,
) {
  // 1) Administrator registration
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123!",
    username: `admin_${RandomGenerator.alphaNumeric(6)}`,
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminBody,
    });
  typia.assert(admin);

  // 2) Create category (as administrator)
  const categoryBody = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    slug: RandomGenerator.alphabets(8),
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

  // 3) Create author account (registered user) and create a thread as that author
  const authorBody = {
    username: `author_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "AuthorPass123!",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const author: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: authorBody,
    });
  typia.assert(author);

  const threadCreateBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 3, wordMax: 8 }),
    slug: `${RandomGenerator.alphabets(6)}-${Date.now()}`,
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      { body: threadCreateBody },
    );
  typia.assert(thread);

  // capture original values for local verification
  const originalTitle = thread.title;
  const originalSlug = thread.slug;
  const originalUpdatedAt = thread.updated_at;

  // 4) Create a second registered user (non-author). The SDK will attach
  //    the new user's token to `connection` automatically, so subsequent
  //    requests will be performed as the non-author.
  const nonAuthorBody = {
    username: `user_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "UserPass123!",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const nonAuthor: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: nonAuthorBody,
    });
  typia.assert(nonAuthor);

  // 5) Attempt to update the thread as the non-author user → should throw
  await TestValidator.error("non-author cannot update thread", async () => {
    await api.functional.econPoliticalForum.registeredUser.threads.update(
      connection,
      {
        threadId: thread.id,
        body: {
          title: `malicious-${RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 6 })}`,
          slug: `mal-${RandomGenerator.alphabets(6)}`,
        } satisfies IEconPoliticalForumThread.IUpdate,
      },
    );
  });

  // Post-condition notes: We captured originalTitle/originalSlug/originalUpdatedAt
  // from the create response. Because the provided SDK does not include a GET
  // thread endpoint, this test asserts that the unauthorized update attempt
  // throws. Full database-level verification (ensuring updated_at unchanged)
  // should be performed by the test harness via DB inspection or a separate
  // GET endpoint when available.

  // Lightweight sanity checks on values returned at creation time
  TestValidator.predicate("created thread has title", originalTitle !== "");
  TestValidator.predicate("created thread has slug", originalSlug !== "");
  TestValidator.predicate(
    "created thread has updated_at",
    typeof originalUpdatedAt === "string",
  );
}
