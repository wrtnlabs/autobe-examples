import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppPublicIndexPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppPublicIndexPreference";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_public_index_preferences_retrieval_by_owner(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * - Verify that a todoUser who creates a public list can retrieve its
   *   associated public index preferences.
   * - Validate access control (unauthorized request), invalid UUID handling, and
   *   not-found behavior.
   *
   * Steps:
   *
   * 1. Join a new todoUser (POST /auth/todoUser/join)
   * 2. Create a public list (POST /todoApp/todoUser/lists)
   * 3. Retrieve publicIndexPreferences as owner (GET
   *    /todoApp/.../publicIndexPreferences)
   * 4. Unauthorized access: same endpoint without auth → expect 401 or 403
   * 5. Invalid UUID format → expect 400
   * 6. Non-existent UUID → expect 404
   */

  // 1) Create a new todoUser via join
  const userInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd-1234",
    displayName: RandomGenerator.name(),
    href: "https://example.com/signup",
    referrer: "https://example.com",
  } satisfies ITodoAppTodoUser.ICreate;

  const authorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userInput,
    });
  typia.assert(authorized);

  // 2) Create a public list as the joined user
  const listBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    visibility: "public",
  } satisfies ITodoAppList.ICreate;

  const createdList: ITodoAppList =
    await api.functional.todoApp.todoUser.lists.create(connection, {
      body: listBody,
    });
  typia.assert(createdList);
  TestValidator.equals(
    "created list visibility is public",
    createdList.visibility,
    "public",
  );

  // 3) Happy path: Retrieve publicIndexPreferences as the owner
  const pref: ITodoAppPublicIndexPreference =
    await api.functional.todoApp.todoUser.lists.publicIndexPreferences.at(
      connection,
      {
        listId: createdList.id,
      },
    );
  typia.assert(pref);

  // Business validations
  TestValidator.equals(
    "preference references created list",
    pref.todoAppListId,
    createdList.id,
  );
  // Typia already enforces types and date formats; assert deletedAt is null
  TestValidator.equals("deleted_at is null", pref.deletedAt, null);
  TestValidator.predicate(
    "indexingEnabled is boolean",
    typeof pref.indexingEnabled === "boolean",
  );

  // 4) Unauthorized access: create an unauthenticated connection copy
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.httpError(
    "unauthorized access should be denied",
    [401, 403],
    async () => {
      await api.functional.todoApp.todoUser.lists.publicIndexPreferences.at(
        unauthConn,
        { listId: createdList.id },
      );
    },
  );

  // 5) Invalid UUID format → expect 400
  // The SDK types the path param as a tagged UUID type. To intentionally send
  // an invalid format while keeping TypeScript satisfied, coerce the string
  // into the tagged type using a safe pattern (satisfies/as). This is only to
  // test server-side validation of path parameter format.
  const invalidListId =
    "not-a-valid-uuid" satisfies string as unknown as string &
      tags.Format<"uuid">;
  await TestValidator.httpError(
    "invalid uuid format should return 400",
    400,
    async () => {
      await api.functional.todoApp.todoUser.lists.publicIndexPreferences.at(
        connection,
        { listId: invalidListId },
      );
    },
  );

  // 6) Not found: use a random UUID that is unlikely to exist
  const nonExistentUuid = typia.random<string & tags.Format<"uuid">>();
  // Ensure we do not accidentally use the created list id
  if (nonExistentUuid === createdList.id) {
    // Regenerate (extremely unlikely) - typia.random is used again
    // Use typia.assert to ensure the value is of correct tagged type
    const again = typia.random<string & tags.Format<"uuid">>();
    typia.assert(again);
  }

  await TestValidator.httpError(
    "non-existent list should return 404",
    404,
    async () => {
      await api.functional.todoApp.todoUser.lists.publicIndexPreferences.at(
        connection,
        { listId: nonExistentUuid },
      );
    },
  );
}
