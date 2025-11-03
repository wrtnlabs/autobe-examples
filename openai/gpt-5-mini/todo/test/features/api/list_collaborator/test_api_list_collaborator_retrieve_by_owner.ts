import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppListCollaborator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppListCollaborator";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_list_collaborator_retrieve_by_owner(
  connection: api.IConnection,
) {
  // 1) Owner signup
  const ownerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "OwnerPassw0rd!",
    displayName: RandomGenerator.name(),
    href: "https://example.com/signup",
    referrer: "https://example.com/",
  } satisfies ITodoAppTodoUser.ICreate;

  const owner: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: ownerBody,
    });
  typia.assert(owner);

  // 2) Collaborator signup
  const collaboratorBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "CollabPassw0rd!",
    displayName: RandomGenerator.name(),
    href: "https://example.com/signup",
    referrer: "https://example.com/",
  } satisfies ITodoAppTodoUser.ICreate;

  const collaborator: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: collaboratorBody,
    });
  typia.assert(collaborator);

  // Create derived connections for owner and collaborator using their tokens
  const ownerConn: api.IConnection = {
    ...connection,
    headers: { Authorization: owner.token.access },
  };
  const collaboratorConn: api.IConnection = {
    ...connection,
    headers: { Authorization: collaborator.token.access },
  };

  // 3) Owner creates a list
  const listBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibility: "shared-invite-only",
  } satisfies ITodoAppList.ICreate;

  const list: ITodoAppList = await api.functional.todoApp.todoUser.lists.create(
    ownerConn,
    {
      body: listBody,
    },
  );
  typia.assert(list);

  // 4) Owner adds collaborator to the list
  const collabCreateBody = {
    todoAppTodouserId: collaborator.id,
    role: "read-write",
  } satisfies ITodoAppListCollaborator.ICreate;

  const createdMembership: ITodoAppListCollaborator =
    await api.functional.todoApp.todoUser.lists.collaborators.create(
      ownerConn,
      {
        listId: list.id,
        body: collabCreateBody,
      },
    );
  typia.assert(createdMembership);

  // 5) Owner retrieves the collaborator membership by id
  const retrieved: ITodoAppListCollaborator =
    await api.functional.todoApp.todoUser.lists.collaborators.at(ownerConn, {
      listId: list.id,
      collaboratorId: createdMembership.id,
    });
  typia.assert(retrieved);

  // 6) Business assertions
  TestValidator.equals(
    "membership scoped to created list",
    retrieved.listId,
    list.id,
  );
  TestValidator.equals(
    "collaborator user id matches created collaborator",
    retrieved.user.id,
    collaborator.id,
  );
  TestValidator.equals(
    "addedBy is the owner who added the collaborator",
    retrieved.addedBy.id,
    owner.id,
  );
  TestValidator.equals(
    "role matches requested role",
    retrieved.role,
    createdMembership.role,
  );

  // Ensure timestamps exist (typia.assert already validated shapes, but check presence for business clarity)
  TestValidator.predicate(
    "createdAt present on membership",
    retrieved.createdAt !== null && retrieved.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updatedAt present on membership",
    retrieved.updatedAt !== null && retrieved.updatedAt !== undefined,
  );

  // Privacy check: ensure sensitive fields such as 'email' are not exposed in the user summary
  TestValidator.predicate(
    "user summary does not expose email",
    !("email" in retrieved.user),
  );

  // Sanity: addedBy summary should also not expose email
  TestValidator.predicate(
    "addedBy summary does not expose email",
    !("email" in retrieved.addedBy),
  );
}
