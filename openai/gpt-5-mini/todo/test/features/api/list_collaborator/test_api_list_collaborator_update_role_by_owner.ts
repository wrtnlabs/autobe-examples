import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppListCollaborator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppListCollaborator";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_list_collaborator_update_role_by_owner(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * - Verify that a list owner can update a collaborator's role from 'read-only'
   *   to 'read-write'.
   * - Verify ownership enforcement: collaborator (non-owner) cannot update the
   *   membership.
   *
   * Flow:
   *
   * 1. Create two todoUser accounts via POST /auth/todoUser/join using two
   *    separate connection clones (ownerConn, collaboratorConn). Each join call
   *    will populate the respective connection.headers.Authorization.
   * 2. As owner, create a todo list via POST /todoApp/todoUser/lists and capture
   *    listId.
   * 3. As owner, add collaborator via POST
   *    /todoApp/todoUser/lists/{listId}/collaborators with role 'read-only'.
   *    Capture the returned membership object (originalMembership).
   * 4. As owner, call PUT
   *    /todoApp/todoUser/lists/{listId}/collaborators/{collaboratorId} to set
   *    role: 'read-write'. Capture updatedMembership.
   * 5. Assert:
   *
   *    - Typia.assert() on all non-void responses
   *    - UpdatedMembership.role === 'read-write'
   *    - UpdatedMembership.updatedAt differs from originalMembership.updatedAt
   *    - AcceptedAt retained (unchanged or explicitly preserved)
   * 6. Ownership enforcement: using collaboratorConn, attempt the same update and
   *    expect an error (await TestValidator.error(...)).
   */

  // 1. Prepare independent authenticated connections for owner and collaborator
  const ownerConn: api.IConnection = { ...connection, headers: {} };
  const collaboratorConn: api.IConnection = { ...connection, headers: {} };

  // 1.a Create owner account
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerAuth = await api.functional.auth.todoUser.join(ownerConn, {
    body: {
      email: ownerEmail,
      password: "Password123!",
      displayName: RandomGenerator.name(),
      href: "http://localhost/app",
      referrer: "http://localhost/",
    } satisfies ITodoAppTodoUser.ICreate,
  });
  typia.assert(ownerAuth);

  // 1.b Create collaborator account
  const collaboratorEmail = typia.random<string & tags.Format<"email">>();
  const collaboratorAuth = await api.functional.auth.todoUser.join(
    collaboratorConn,
    {
      body: {
        email: collaboratorEmail,
        password: "Password123!",
        displayName: RandomGenerator.name(),
        href: "http://localhost/app",
        referrer: "http://localhost/",
      } satisfies ITodoAppTodoUser.ICreate,
    },
  );
  typia.assert(collaboratorAuth);

  // 2. Owner creates a todo list
  const list = await api.functional.todoApp.todoUser.lists.create(ownerConn, {
    body: {
      title: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 4,
        wordMax: 8,
      }),
      description: RandomGenerator.paragraph({
        sentences: 6,
        wordMin: 4,
        wordMax: 10,
      }),
      visibility: "shared-invite-only",
    } satisfies ITodoAppList.ICreate,
  });
  typia.assert(list);
  TestValidator.predicate("created list has id", typeof list.id === "string");

  // 3. Owner adds collaborator with initial role 'read-only'
  const membership =
    await api.functional.todoApp.todoUser.lists.collaborators.create(
      ownerConn,
      {
        listId: list.id,
        body: {
          todoAppTodouserId: collaboratorAuth.id,
          role: "read-only",
        } satisfies ITodoAppListCollaborator.ICreate,
      },
    );
  typia.assert(membership);
  TestValidator.equals(
    "membership listId matches list",
    membership.listId,
    list.id,
  );
  TestValidator.equals(
    "membership role is read-only",
    membership.role,
    "read-only",
  );

  // 4. Owner updates collaborator role to 'read-write'
  const originalUpdatedAt = membership.updatedAt;
  const originalAcceptedAt = membership.acceptedAt ?? null;

  const updated =
    await api.functional.todoApp.todoUser.lists.collaborators.update(
      ownerConn,
      {
        listId: list.id,
        collaboratorId: membership.id,
        body: {
          role: "read-write",
        } satisfies ITodoAppListCollaborator.IUpdate,
      },
    );
  typia.assert(updated);

  // 5. Assertions
  TestValidator.equals(
    "role updated to read-write",
    updated.role,
    "read-write",
  );
  TestValidator.notEquals(
    "updatedAt changed after update",
    originalUpdatedAt,
    updated.updatedAt,
  );
  TestValidator.equals(
    "acceptedAt retained or unchanged",
    updated.acceptedAt ?? null,
    originalAcceptedAt,
  );

  // 6. Ownership enforcement: collaborator (non-owner) must NOT be able to update
  await TestValidator.error(
    "non-owner cannot update collaborator role",
    async () => {
      await api.functional.todoApp.todoUser.lists.collaborators.update(
        collaboratorConn,
        {
          listId: list.id,
          collaboratorId: membership.id,
          body: {
            role: "read-only",
          } satisfies ITodoAppListCollaborator.IUpdate,
        },
      );
    },
  );

  // Final: re-fetch updated membership (optional - using owner) and assert again
  // (SDK does not expose a dedicated GET collaborator endpoint in provided list;
  //  if available, here we would re-fetch. For safety, assert the already
  //  returned 'updated' object is valid.)
  typia.assert(updated);
}
