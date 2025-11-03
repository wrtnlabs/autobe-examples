import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppListCollaborator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppListCollaborator";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_list_collaborator_revoke_forbidden_by_non_owner(
  connection: api.IConnection,
) {
  /**
   * Authorization negative case: Non-owner cannot revoke collaborator
   * membership.
   *
   * Business flow:
   *
   * 1. Create three accounts (owner, collaborator, attacker) using isolated
   *    connections
   * 2. Owner creates a list and adds the collaborator
   * 3. Attacker attempts to revoke the collaborator -> expect an error
   *    (authorization)
   * 4. Verify membership remains by attempting duplicate creation -> expect an
   *    error (unique constraint)
   *
   * Notes:
   *
   * - We intentionally do not assert raw HTTP status codes (e.g., 403) per
   *   test-generation rules; instead we assert that the operation throws.
   * - No audit log API is available; audit verification is omitted.
   */

  // Use separate connection objects so SDK join() does not overwrite a single connection's headers
  const ownerConn: api.IConnection = { ...connection, headers: {} };
  const collaboratorConn: api.IConnection = { ...connection, headers: {} };
  const attackerConn: api.IConnection = { ...connection, headers: {} };

  // 1) Owner signup
  const ownerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "OwnerPassw0rd",
    href: "https://example.com/owner",
    referrer: "https://example.com",
    displayName: RandomGenerator.name(),
  } satisfies ITodoAppTodoUser.ICreate;

  const owner: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(ownerConn, { body: ownerBody });
  typia.assert(owner);

  // 2) Collaborator signup (target)
  const collBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "CollabPassw0rd",
    href: "https://example.com/collab",
    referrer: "https://example.com",
    displayName: RandomGenerator.name(),
  } satisfies ITodoAppTodoUser.ICreate;

  const collaborator: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(collaboratorConn, {
      body: collBody,
    });
  typia.assert(collaborator);

  // 3) Attacker signup
  const attackerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Attack3rPass",
    href: "https://example.com/attacker",
    referrer: "https://example.com",
    displayName: RandomGenerator.name(),
  } satisfies ITodoAppTodoUser.ICreate;

  const attacker: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(attackerConn, {
      body: attackerBody,
    });
  typia.assert(attacker);

  // 4) Owner creates a list
  const listBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "shared-invite-only",
  } satisfies ITodoAppList.ICreate;

  const list: ITodoAppList = await api.functional.todoApp.todoUser.lists.create(
    ownerConn,
    { body: listBody },
  );
  typia.assert(list);

  // 5) Owner adds collaborator
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

  // Additional sanity checks
  TestValidator.equals(
    "membership belongs to created list",
    membership.listId,
    list.id,
  );
  TestValidator.equals(
    "membership assigned to expected user",
    membership.user.id,
    collaborator.id,
  );

  // 6) Attacker attempts to revoke the collaborator membership -> expect an error
  await TestValidator.error(
    "attacker cannot revoke collaborator membership",
    async () => {
      await api.functional.todoApp.todoUser.lists.collaborators.erase(
        attackerConn,
        {
          listId: list.id,
          collaboratorId: collaborator.id,
        },
      );
    },
  );

  // 7) Verify membership remains by attempting duplicate creation -> expect error
  await TestValidator.error(
    "duplicate collaborator creation fails (membership still exists)",
    async () => {
      await api.functional.todoApp.todoUser.lists.collaborators.create(
        ownerConn,
        {
          listId: list.id,
          body: collaboratorCreateBody,
        },
      );
    },
  );
}
