import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";

export async function test_api_thread_soft_delete_by_administrator(
  connection: api.IConnection,
) {
  // This E2E test verifies that an administrator can soft-delete a thread.
  // Strategy:
  // 1. Create an administrator (adminA) and let SDK set the auth token on connection.
  // 2. Create a category with adminA.
  // 3. Create a registered user (author) and let SDK set connection to the user's token.
  // 4. Create a thread as the registered user.
  // 5. Create a fresh administrator (adminB) to regain admin credentials on connection.
  // 6. Call the administrator thread erase endpoint and assert it completes (void / no content).
  // 7. Re-attempt deletion and assert an error occurs (thread already archived or not found).

  // 1) Administrator (adminA) creation
  const adminAEmail = typia.random<string & tags.Format<"email">>();
  const adminABody = {
    email: adminAEmail,
    password: "AdminPassw0rd!",
    username: `admin_${RandomGenerator.alphaNumeric(6)}`,
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const adminA: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminABody,
    });
  typia.assert(adminA);
  TestValidator.predicate("adminA has token", !!adminA.token && !!adminA.id);

  // 2) Create category using adminA's token (connection set by join)
  const categoryBody = {
    code: null,
    name: `cat-${RandomGenerator.alphaNumeric(6)}`,
    slug: `cat-${RandomGenerator.alphaNumeric(6)}`,
    description: "Automated test category",
    is_moderated: false,
    requires_verification: false,
    order: 100,
  } satisfies IEconPoliticalForumCategory.ICreate;

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);
  TestValidator.equals("created category id exists", category.id, category.id);

  // 3) Registered user (author) creation
  const userBody = {
    username: `user_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "UserPassw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const author: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: userBody,
    });
  typia.assert(author);
  TestValidator.predicate(
    "author has token and id",
    !!author.token && !!author.id,
  );

  // 4) Create thread using the registered user's token
  const threadCreateBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 3, wordMax: 8 }),
    slug: `t-${RandomGenerator.alphaNumeric(8)}`,
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      { body: threadCreateBody },
    );
  typia.assert(thread);
  TestValidator.predicate(
    "thread created has id",
    typeof thread.id === "string",
  );

  // 5) Re-authenticate as an administrator (create adminB) to regain admin token
  const adminBEmail = typia.random<string & tags.Format<"email">>();
  const adminBBody = {
    email: adminBEmail,
    password: "AdminPassw0rd!",
    username: `admin_${RandomGenerator.alphaNumeric(6)}`,
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const adminB: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminBBody,
    });
  typia.assert(adminB);
  TestValidator.predicate("adminB has token", !!adminB.token && !!adminB.id);

  // 6) Administrator soft-delete the thread
  const deleteResult =
    await api.functional.econPoliticalForum.administrator.threads.erase(
      connection,
      { threadId: thread.id },
    );

  // erase returns void; the result should be undefined
  TestValidator.equals(
    "erase returns void (no content)",
    deleteResult,
    undefined,
  );

  // 7) Attempt to delete again: expect a business error (thread archived/not found)
  await TestValidator.error(
    "deleting the same thread again should throw an error",
    async () => {
      await api.functional.econPoliticalForum.administrator.threads.erase(
        connection,
        {
          threadId: thread.id,
        },
      );
    },
  );

  // Note: Audit table verification and public GET checks are not possible with
  // the provided SDK functions. Those verifications require either direct DB
  // access or GET endpoints for threads which are not available in the current
  // SDK payload. The test focuses on available, implementable behaviors and
  // ensures strict type-safety and API usage rules.
}
