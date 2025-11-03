import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppPublicIndexPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppPublicIndexPreference";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

/**
 * Validate admin retrieval of a list's public index preferences.
 *
 * Business context:
 *
 * - A normal todoUser creates a public list. Administrative operators must be
 *   able to review the list's public-indexing preferences (indexingEnabled,
 *   allowSearchEngine, allowDiscovery, indexScope) via an admin-scoped
 *   endpoint.
 *
 * Test steps:
 *
 * 1. Register a todoUser (join) and capture auth token (SDK will set it on
 *    connection.headers).
 * 2. Create a public todo list as the todoUser and capture list.id.
 * 3. Register a new admin (join) using a fresh unauthenticated connection.
 * 4. As admin, GET the public index preferences for the created list and validate
 *    the response shape and business fields.
 * 5. Unauthorized access: attempt the same admin GET using the todoUser token and
 *    assert an error is thrown (authorization enforcement).
 * 6. Not-found: call the admin GET with a valid, random UUID that does not map to
 *    an existing list and assert an error is thrown.
 */
export async function test_api_public_index_preferences_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1) todoUser join (self-signup)
  const todoUser = await api.functional.auth.todoUser.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123",
      displayName: RandomGenerator.name(),
      href: "http://example.com/signup",
      referrer: "http://referrer.example/",
    } satisfies ITodoAppTodoUser.ICreate,
  });
  typia.assert(todoUser);

  // 2) Create a public list as the todoUser
  const list = await api.functional.todoApp.todoUser.lists.create(connection, {
    body: {
      title: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 3,
        wordMax: 8,
      }),
      description: RandomGenerator.paragraph({ sentences: 5 }),
      visibility: "public",
    } satisfies ITodoAppList.ICreate,
  });
  typia.assert(list);

  // 3) Admin join using a fresh unauthenticated connection object
  const adminConn: api.IConnection = { ...connection, headers: {} };
  const admin = await api.functional.auth.admin.join(adminConn, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Adm1nPass!",
      display_name: RandomGenerator.name(),
      role: "superadmin",
      href: "http://example.com/admin-join",
      referrer: "http://referrer.example/",
    } satisfies ITodoAppAdmin.ICreate,
  });
  typia.assert(admin);

  // 4) Happy-path: admin retrieves public index preferences for the created list
  const pref: ITodoAppPublicIndexPreference =
    await api.functional.todoApp.admin.lists.publicIndexPreferences.at(
      adminConn,
      {
        listId: list.id,
      },
    );
  typia.assert(pref);

  // Business-level validations
  TestValidator.equals(
    "preference belongs to created list",
    pref.todoAppListId,
    list.id,
  );
  TestValidator.predicate(
    "indexScope is string or null",
    pref.indexScope === null || typeof pref.indexScope === "string",
  );
  TestValidator.predicate(
    "indexingEnabled is boolean",
    typeof pref.indexingEnabled === "boolean",
  );
  TestValidator.predicate(
    "allowSearchEngine is boolean",
    typeof pref.allowSearchEngine === "boolean",
  );
  TestValidator.predicate(
    "allowDiscovery is boolean",
    typeof pref.allowDiscovery === "boolean",
  );

  // 5) Unauthorized access: using todoUser token (connection currently holds todoUser token)
  await TestValidator.error(
    "non-admin cannot access admin publicIndexPreferences",
    async () => {
      await api.functional.todoApp.admin.lists.publicIndexPreferences.at(
        connection,
        {
          listId: list.id,
        },
      );
    },
  );

  // 6) Not-found: admin requests preferences for a non-existent list id
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "admin requesting preferences for non-existent list should fail",
    async () => {
      await api.functional.todoApp.admin.lists.publicIndexPreferences.at(
        adminConn,
        {
          listId: nonExistentId,
        },
      );
    },
  );
}
