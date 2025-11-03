import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppListCollaborator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppListCollaborator";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_list_collaborator_retrieve_by_collaborator(
  connection: api.IConnection,
) {
  /**
   * Collaborator retrieves their own membership (happy path for self-access).
   *
   * Steps implemented:
   *
   * 1. Create owner and collaborator accounts via POST /auth/todoUser/join;
   * 2. Owner creates a todo list via POST /todoApp/todoUser/lists;
   * 3. Owner adds collaborator via POST
   *    /todoApp/todoUser/lists/{listId}/collaborators;
   * 4. Using the collaborator's connection, call GET
   *    /todoApp/todoUser/lists/{listId}/collaborators/{collaboratorId};
   * 5. Validate the returned membership matches the created membership and
   *    business expectations.
   */

  // Prepare isolated connection clones for independent auth contexts
  const ownerConn: api.IConnection = { ...connection, headers: {} };
  const collaboratorConn: api.IConnection = { ...connection, headers: {} };

  // 1. Owner signup
  const ownerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    displayName: RandomGenerator.name(),
    href: "http://localhost/signup",
    referrer: "http://localhost/",
  } satisfies ITodoAppTodoUser.ICreate;

  const owner: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(ownerConn, { body: ownerBody });
  typia.assert(owner);

  // 1b. Collaborator signup
  const collaboratorBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    displayName: RandomGenerator.name(),
    href: "http://localhost/signup",
    referrer: "http://localhost/",
  } satisfies ITodoAppTodoUser.ICreate;

  const collaborator: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(collaboratorConn, {
      body: collaboratorBody,
    });
  typia.assert(collaborator);

  // 2. Owner creates a todo list
  const listBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 4,
      wordMax: 10,
    }),
    visibility: "shared-invite-only",
  } satisfies ITodoAppList.ICreate;

  const list: ITodoAppList = await api.functional.todoApp.todoUser.lists.create(
    ownerConn,
    { body: listBody },
  );
  typia.assert(list);

  // 3. Owner adds collaborator to the list
  const collaboratorCreateBody = {
    todoAppTodouserId: collaborator.id,
    role: "read-write",
  } satisfies ITodoAppListCollaborator.ICreate;

  const membership: ITodoAppListCollaborator =
    await api.functional.todoApp.todoUser.lists.collaborators.create(
      ownerConn,
      {
        listId: list.id,
        body: collaboratorCreateBody,
      },
    );
  typia.assert(membership);

  // 4. Collaborator retrieves their own membership using their auth context
  const retrieved: ITodoAppListCollaborator =
    await api.functional.todoApp.todoUser.lists.collaborators.at(
      collaboratorConn,
      {
        listId: list.id,
        collaboratorId: membership.id,
      },
    );
  typia.assert(retrieved);

  // 5. Business validations
  TestValidator.equals(
    "membership id matches created membership",
    retrieved.id,
    membership.id,
  );
  TestValidator.equals(
    "membership listId matches parent list",
    retrieved.listId,
    list.id,
  );
  TestValidator.equals(
    "membership user id is the collaborator user id",
    retrieved.user.id,
    collaborator.id,
  );
  TestValidator.equals(
    "membership addedBy id is the owner id",
    retrieved.addedBy.id,
    owner.id,
  );
  TestValidator.equals(
    "membership role matches requested role",
    retrieved.role,
    membership.role,
  );

  // Ensure timestamps exist (basic predicate trusting typia.assert validated formats)
  TestValidator.predicate(
    "membership has createdAt",
    typeof retrieved.createdAt === "string" && retrieved.createdAt.length > 0,
  );
  TestValidator.predicate(
    "membership has updatedAt",
    typeof retrieved.updatedAt === "string" && retrieved.updatedAt.length > 0,
  );
}
