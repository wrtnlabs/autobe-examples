import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppListCollaborator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppListCollaborator";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_list_collaborator_retrieve_unauthorized_user(
  connection: api.IConnection,
) {
  /**
   * Test: Unauthorized user attempts to retrieve a collaborator membership and
   * is denied.
   *
   * Steps:
   *
   * 1. Create owner, collaborator, unauthorizedUser accounts (separate
   *    connections)
   * 2. Owner creates a list
   * 3. Owner adds collaborator to the list
   * 4. Unauthorized user attempts to retrieve the collaborator membership and
   *    should receive 403 or 404
   */

  // 1) Create three distinct users using separate connection clones
  const ownerConn: api.IConnection = { ...connection, headers: {} };
  const collaboratorConn: api.IConnection = { ...connection, headers: {} };
  const unauthorizedConn: api.IConnection = { ...connection, headers: {} };

  // Owner signup
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const owner: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(ownerConn, {
      body: {
        email: ownerEmail,
        password: "P@ssw0rd-Owner1",
        displayName: RandomGenerator.name(),
        href: "http://example.com/signup",
        referrer: "http://example.com/",
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(owner);

  // Collaborator signup
  const collaboratorEmail = typia.random<string & tags.Format<"email">>();
  const collaboratorAuth: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(collaboratorConn, {
      body: {
        email: collaboratorEmail,
        password: "P@ssw0rd-Collab1",
        displayName: RandomGenerator.name(),
        href: "http://example.com/signup",
        referrer: "http://example.com/",
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(collaboratorAuth);

  // Unauthorized user signup
  const unauthEmail = typia.random<string & tags.Format<"email">>();
  const unauthUser: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(unauthorizedConn, {
      body: {
        email: unauthEmail,
        password: "P@ssw0rd-Unauth1",
        displayName: RandomGenerator.name(),
        href: "http://example.com/signup",
        referrer: "http://example.com/",
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(unauthUser);

  // 2) Owner creates a todo list
  const list: ITodoAppList = await api.functional.todoApp.todoUser.lists.create(
    ownerConn,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 8,
        }),
        visibility: "shared-invite-only",
      } satisfies ITodoAppList.ICreate,
    },
  );
  typia.assert(list);
  TestValidator.equals("created list id matches", list.id, list.id);

  // 3) Owner adds the collaborator to the list
  const membership: ITodoAppListCollaborator =
    await api.functional.todoApp.todoUser.lists.collaborators.create(
      ownerConn,
      {
        listId: list.id,
        body: {
          todoAppTodouserId: collaboratorAuth.id,
          role: "read-write",
        } satisfies ITodoAppListCollaborator.ICreate,
      },
    );
  typia.assert(membership);
  TestValidator.equals(
    "collaborator user id matches",
    membership.user.id,
    collaboratorAuth.id,
  );

  // 4) Unauthorized user attempts to retrieve the collaborator membership
  // Expectation: Should be rejected with 403 Forbidden or 404 Not Found
  await TestValidator.httpError(
    "unauthorized user cannot retrieve collaborator membership",
    [403, 404],
    async () => {
      await api.functional.todoApp.todoUser.lists.collaborators.at(
        unauthorizedConn,
        {
          listId: list.id,
          collaboratorId: membership.id,
        },
      );
    },
  );
}
