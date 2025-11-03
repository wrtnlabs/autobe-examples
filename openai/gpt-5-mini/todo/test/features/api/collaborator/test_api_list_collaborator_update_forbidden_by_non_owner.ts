import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppListCollaborator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppListCollaborator";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_list_collaborator_update_forbidden_by_non_owner(
  connection: api.IConnection,
) {
  /**
   * Authorization negative case: Non-owner cannot update collaborator
   * membership.
   *
   * Steps implemented:
   *
   * 1. Create three users (owner, collaborator, attacker) via auth.todoUser.join
   *    using cloned connections so each connection holds its own Authorization
   *    header after join.
   * 2. Owner creates a list.
   * 3. Owner adds the collaborator with role 'read-only'. Save the returned
   *    membership as originalMembership.
   * 4. Attacker attempts to update the collaborator membership to 'read-write'.
   *    Use TestValidator.error(async) to assert that the operation throws.
   * 5. Assert that originalMembership.role remains 'read-only' (as returned at
   *    creation time). This demonstrates the attacker did not succeed in
   *    updating the membership prior to owner action.
   * 6. Owner updates the collaborator to 'read-write' successfully and we assert
   *    the returned membership reflects the change and updatedAt differs.
   */

  // 0. Prepare separate connections for each actor so SDK stores tokens per-connection
  const ownerConn: api.IConnection = { ...connection, headers: {} };
  const collaboratorConn: api.IConnection = { ...connection, headers: {} };
  const attackerConn: api.IConnection = { ...connection, headers: {} };

  // 1. Sign up three users
  const ownerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "OwnerPass123!",
    displayName: RandomGenerator.name(),
    href: "http://localhost/",
    referrer: "http://localhost/",
  } satisfies ITodoAppTodoUser.ICreate;

  const owner: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(ownerConn, { body: ownerBody });
  typia.assert(owner);

  const collaboratorBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "CollabPass123!",
    displayName: RandomGenerator.name(),
    href: "http://localhost/",
    referrer: "http://localhost/",
  } satisfies ITodoAppTodoUser.ICreate;

  const collaborator: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(collaboratorConn, {
      body: collaboratorBody,
    });
  typia.assert(collaborator);

  const attackerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AttackPass123!",
    displayName: RandomGenerator.name(),
    href: "http://localhost/",
    referrer: "http://localhost/",
  } satisfies ITodoAppTodoUser.ICreate;

  const attacker: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(attackerConn, {
      body: attackerBody,
    });
  typia.assert(attacker);

  // 2. Owner creates a list
  const listCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 6,
      wordMax: 12,
    }),
    visibility: "shared-invite-only",
  } satisfies ITodoAppList.ICreate;

  const list: ITodoAppList = await api.functional.todoApp.todoUser.lists.create(
    ownerConn,
    { body: listCreateBody },
  );
  typia.assert(list);

  // 3. Owner adds collaborator membership with role 'read-only'
  const collabCreateBody = {
    todoAppTodouserId: collaborator.id,
    role: "read-only",
  } satisfies ITodoAppListCollaborator.ICreate;

  const originalMembership: ITodoAppListCollaborator =
    await api.functional.todoApp.todoUser.lists.collaborators.create(
      ownerConn,
      {
        listId: list.id,
        body: collabCreateBody,
      },
    );
  typia.assert(originalMembership);
  TestValidator.equals(
    "initial collaborator role is read-only",
    originalMembership.role,
    "read-only",
  );

  // 4. Attacker attempts to update collaborator's role to 'read-write' -> must fail
  await TestValidator.error(
    "attacker cannot update collaborator membership",
    async () => {
      await api.functional.todoApp.todoUser.lists.collaborators.update(
        attackerConn,
        {
          listId: list.id,
          collaboratorId: collaborator.id,
          body: {
            role: "read-write",
          } satisfies ITodoAppListCollaborator.IUpdate,
        },
      );
    },
  );

  // 5. Assert that the membership we originally received still reports 'read-only'
  // (demonstrates the attacker did not successfully mutate the membership prior to owner action)
  TestValidator.equals(
    "membership role remains read-only after failed attacker attempt",
    originalMembership.role,
    "read-only",
  );

  // 6. Owner successfully updates the collaborator to 'read-write'
  const updatedMembership: ITodoAppListCollaborator =
    await api.functional.todoApp.todoUser.lists.collaborators.update(
      ownerConn,
      {
        listId: list.id,
        collaboratorId: collaborator.id,
        body: {
          role: "read-write",
        } satisfies ITodoAppListCollaborator.IUpdate,
      },
    );
  typia.assert(updatedMembership);

  TestValidator.equals(
    "owner can update collaborator to read-write",
    updatedMembership.role,
    "read-write",
  );

  TestValidator.notEquals(
    "updatedAt should change after owner update",
    originalMembership.updatedAt,
    updatedMembership.updatedAt,
  );
}
