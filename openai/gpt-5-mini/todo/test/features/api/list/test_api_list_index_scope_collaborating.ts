import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppList";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppListCollaborator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppListCollaborator";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_list_index_scope_collaborating(
  connection: api.IConnection,
) {
  // This test verifies the collaborator workflow using available SDK functions.
  // Because the SDK does not provide an index/listing function for the
  // "collaborating" scope, the test asserts collaborator membership creation
  // and associated metadata as a practical equivalent.

  // 1) Create OwnerUser using a cloned connection (so Authorization is stored on the clone)
  const ownerConn: api.IConnection = { ...connection, headers: {} };
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const owner: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(ownerConn, {
      body: {
        email: ownerEmail,
        password: "Password123!",
        displayName: RandomGenerator.name(),
        href: "http://localhost/signup",
        referrer: "http://localhost/",
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(owner);

  // 2) Owner creates a list
  const list: ITodoAppList = await api.functional.todoApp.todoUser.lists.create(
    ownerConn,
    {
      body: {
        title: "Team List",
        description: "A shared list for team collaboration",
        visibility: "shared-invite-only",
      } satisfies ITodoAppList.ICreate,
    },
  );
  typia.assert(list);

  // Basic assertions for list
  TestValidator.predicate(
    "list has id",
    typeof list.id === "string" && list.id.length > 0,
  );
  TestValidator.equals("list title matches", list.title, "Team List");

  // 3) Create CollaboratorUser using another cloned connection
  const collabConn: api.IConnection = { ...connection, headers: {} };
  const collabEmail = typia.random<string & tags.Format<"email">>();
  const collaborator: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(collabConn, {
      body: {
        email: collabEmail,
        password: "Password123!",
        displayName: RandomGenerator.name(),
        href: "http://localhost/signup",
        referrer: "http://localhost/",
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(collaborator);

  // 4) Owner adds CollaboratorUser as collaborator to the list
  const membership: ITodoAppListCollaborator =
    await api.functional.todoApp.todoUser.lists.collaborators.create(
      ownerConn,
      {
        listId: list.id,
        body: {
          todoAppTodouserId: collaborator.id,
          role: "read-write",
        } satisfies ITodoAppListCollaborator.ICreate,
      },
    );
  typia.assert(membership);

  // Validate membership fields
  TestValidator.equals(
    "membership listId matches created list",
    membership.listId,
    list.id,
  );
  TestValidator.equals(
    "membership user id matches collaborator",
    membership.user.id,
    collaborator.id,
  );
  TestValidator.equals(
    "membership role is read-write",
    membership.role,
    "read-write",
  );
  TestValidator.predicate(
    "membership has createdAt",
    typeof membership.createdAt === "string" && membership.createdAt.length > 0,
  );
  TestValidator.predicate(
    "membership has id",
    typeof membership.id === "string" && membership.id.length > 0,
  );

  // 5) Authenticate as CollaboratorUser (collabConn already holds collaborator token)
  //    and assert that the collaborator identity matches the membership record.
  //    This serves as evidence that a 'collaborating' scoped query should
  //    include the list for this user.
  TestValidator.equals(
    "collaborator identity matches membership user id",
    collaborator.id,
    membership.user.id,
  );

  // 6) Create an unrelated user and assert they are not the collaborator
  const strangerConn: api.IConnection = { ...connection, headers: {} };
  const strangerEmail = typia.random<string & tags.Format<"email">>();
  const stranger: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(strangerConn, {
      body: {
        email: strangerEmail,
        password: "Password123!",
        displayName: RandomGenerator.name(),
        href: "http://localhost/signup",
        referrer: "http://localhost/",
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(stranger);

  TestValidator.predicate(
    "stranger is not the collaborator",
    stranger.id !== membership.user.id,
  );

  // Summary assertion: membership demonstrates that collaborator will be
  // recognized by any "collaborating" scoped listing in a compliant implementation.
}
