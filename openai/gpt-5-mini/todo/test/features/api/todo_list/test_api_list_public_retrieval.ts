import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_list_public_retrieval(
  connection: api.IConnection,
) {
  // NOTE: This E2E test performs the following sequence:
  // 1) Create a todoUser via POST /auth/todoUser/join -> obtains token (SDK injects token into connection.headers)
  // 2) Create two lists (public and private) via POST /todoApp/todoUser/lists
  // 3) Without authentication (unauthConn), GET the public list -> expect 200 and ITodoAppList shape
  // 4) Without authentication, GET the private list -> expect authorization denial (403 or 404)
  // 5) With owner token (original connection), GET the private list -> expect 200 and owner-visible fields
  // IMPORTANT: typia.assert() is used to validate response types; TestValidator.* used for business assertions

  // 1) Register a new todoUser (join) to act as owner
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const owner: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: {
        email: userEmail,
        password: "Password123!",
        href: "https://example.com/signup",
        referrer: "https://example.com",
        displayName: RandomGenerator.name(),
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(owner);

  // 2) Create a public list
  const publicListTitle = "Public Shopping List";
  const publicList: ITodoAppList =
    await api.functional.todoApp.todoUser.lists.create(connection, {
      body: {
        title: publicListTitle,
        visibility: "public",
      } satisfies ITodoAppList.ICreate,
    });
  typia.assert(publicList);

  // 2b) Create a private list
  const privateListTitle = "Private Work List";
  const privateList: ITodoAppList =
    await api.functional.todoApp.todoUser.lists.create(connection, {
      body: {
        title: privateListTitle,
        visibility: "private",
      } satisfies ITodoAppList.ICreate,
    });
  typia.assert(privateList);

  // Save ids for downstream verification
  const publicListId: string = publicList.id;
  const privateListId: string = privateList.id;

  // 3) Unauthenticated retrieval of public list
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const publicRead: ITodoAppList = await api.functional.todoApp.lists.at(
    unauthConn,
    { listId: publicListId },
  );
  typia.assert(publicRead);

  // Business assertions for public list
  TestValidator.equals("public list id matches", publicRead.id, publicListId);
  TestValidator.equals(
    "public list title matches",
    publicRead.title,
    publicListTitle,
  );
  TestValidator.equals(
    "public list visibility is public",
    publicRead.visibility,
    "public",
  );
  // Owner summary must be present but not necessarily identical object reference
  TestValidator.predicate(
    "public list has owner summary",
    publicRead.owner !== null &&
      publicRead.owner !== undefined &&
      typeof publicRead.owner.id === "string",
  );

  // 4) Unauthenticated retrieval of private list should be denied (403 or 404)
  await TestValidator.httpError(
    "unauthenticated access to private list should be denied",
    [403, 404],
    async () => {
      await api.functional.todoApp.lists.at(unauthConn, {
        listId: privateListId,
      });
    },
  );

  // 5) Owner (authenticated) retrieval of private list should succeed
  const privateReadByOwner: ITodoAppList =
    await api.functional.todoApp.lists.at(connection, {
      listId: privateListId,
    });
  typia.assert(privateReadByOwner);
  TestValidator.equals(
    "private list id matches for owner",
    privateReadByOwner.id,
    privateListId,
  );
  TestValidator.equals(
    "private list title matches for owner",
    privateReadByOwner.title,
    privateListTitle,
  );
  TestValidator.equals(
    "private list visibility is private for owner",
    privateReadByOwner.visibility,
    "private",
  );

  // Owner summary must reference the owner created earlier
  TestValidator.equals(
    "owner id equals created user id",
    privateReadByOwner.owner.id,
    owner.id,
  );

  // Note: typia.assert already validated createdAt/updatedAt formats per DTO tags.
  // End of test
}
