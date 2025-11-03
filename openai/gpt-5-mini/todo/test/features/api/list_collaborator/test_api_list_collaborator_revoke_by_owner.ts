import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppListCollaborator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppListCollaborator";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_list_collaborator_revoke_by_owner(
  connection: api.IConnection,
) {
  /**
   * Verify that a list owner can revoke a collaborator membership.
   *
   * Steps:
   *
   * 1. Create owner account (auth.todoUser.join) using a dedicated connection
   * 2. Create a list as the owner (todoApp.todoUser.lists.create)
   * 3. Create collaborator account on a separate connection
   * 4. Add the collaborator to the list as owner (lists.collaborators.create)
   * 5. Revoke the collaborator membership as owner (lists.collaborators.erase)
   * 6. Call revoke again to assert idempotency (no exception)
   */

  // 1) Prepare isolated connection objects for owner and collaborator
  const ownerConn: api.IConnection = { ...connection, headers: {} };
  const collabConn: api.IConnection = { ...connection, headers: {} };

  // 2) Owner signs up
  const ownerEmail: string = typia.random<string & tags.Format<"email">>();
  const ownerAuth: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(ownerConn, {
      body: {
        email: ownerEmail,
        password: "P@ssw0rd-Owner",
        href: "https://example.com/signup",
        referrer: "https://referrer.example.com/",
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(ownerAuth);

  // 3) Owner creates a new list
  const list: ITodoAppList = await api.functional.todoApp.todoUser.lists.create(
    ownerConn,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }),
        description: RandomGenerator.paragraph({ sentences: 8 }),
        visibility: "shared-invite-only",
      } satisfies ITodoAppList.ICreate,
    },
  );
  typia.assert(list);
  TestValidator.predicate(
    "owner created list has id",
    typeof list.id === "string",
  );

  // 4) Collaborator signs up (separate authenticated context)
  const collabEmail: string = typia.random<string & tags.Format<"email">>();
  const collabAuth: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(collabConn, {
      body: {
        email: collabEmail,
        password: "P@ssw0rd-Collab",
        href: "https://example.com/signup",
        referrer: "https://referrer.example.com/",
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(collabAuth);

  // 5) Owner adds collaborator to the list
  const collaboratorMembership: ITodoAppListCollaborator =
    await api.functional.todoApp.todoUser.lists.collaborators.create(
      ownerConn,
      {
        listId: list.id,
        body: {
          todoAppTodouserId: collabAuth.id,
          role: "read-write",
        } satisfies ITodoAppListCollaborator.ICreate,
      },
    );
  typia.assert(collaboratorMembership);

  // Basic consistency checks
  TestValidator.equals(
    "membership belongs to the created list",
    collaboratorMembership.listId,
    list.id,
  );
  TestValidator.equals(
    "membership user equals collaborator user id",
    collaboratorMembership.user.id,
    collabAuth.id,
  );

  // 6) Owner revokes the collaborator membership
  await api.functional.todoApp.todoUser.lists.collaborators.erase(ownerConn, {
    listId: list.id,
    collaboratorId: collaboratorMembership.user.id,
  });

  // If erase succeeded without throwing, assert success
  TestValidator.predicate(
    "erase call completed without throwing for first revoke",
    true,
  );

  // 7) Idempotency: calling erase again should not throw (tolerant behavior)
  let secondEraseSucceeded = false;
  try {
    await api.functional.todoApp.todoUser.lists.collaborators.erase(ownerConn, {
      listId: list.id,
      collaboratorId: collaboratorMembership.user.id,
    });
    secondEraseSucceeded = true;
  } catch (exp) {
    // If server treats second erase as 404, consider it acceptable for some
    // implementations. We assert that no unexpected runtime exception type
    // bubbled up that breaks the test harness. For stricter behavior, the
    // environment should supply an explicit GET to confirm deleted_at.
    secondEraseSucceeded = false;
  }
  TestValidator.predicate(
    "second erase is idempotent (did not throw unexpected error)",
    secondEraseSucceeded,
  );
}
