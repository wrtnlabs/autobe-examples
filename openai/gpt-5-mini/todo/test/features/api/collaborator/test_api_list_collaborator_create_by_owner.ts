import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppListCollaborator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppListCollaborator";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_list_collaborator_create_by_owner(
  connection: api.IConnection,
) {
  // 1. Prepare isolated connections for owner and invitee to avoid touching the
  // provided `connection.headers` directly. The SDK will place tokens into
  // these cloned connection objects when join() is called.
  const ownerConn: api.IConnection = { ...connection, headers: {} };
  const inviteeConn: api.IConnection = { ...connection, headers: {} };

  // 2. Owner registration + authentication
  const ownerEmail = `${RandomGenerator.name(1).replace(/\s+/g, "").toLowerCase()}@example.com`;
  const owner: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(ownerConn, {
      body: {
        email: ownerEmail,
        password: "owner-pass-123",
        displayName: RandomGenerator.name(),
        href: "https://example.com/signup",
        referrer: "https://example.com/",
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(owner);

  // 3. Owner creates a todo list
  const listTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const createdList: ITodoAppList =
    await api.functional.todoApp.todoUser.lists.create(ownerConn, {
      body: {
        title: listTitle,
        description: RandomGenerator.paragraph({ sentences: 6 }),
        visibility: "shared-invite-only",
      } satisfies ITodoAppList.ICreate,
    });
  typia.assert(createdList);

  // Basic check: createdList.owner.id should equal owner.id (owner summary is returned)
  TestValidator.equals(
    "created list owner matches registering owner",
    createdList.owner.id,
    owner.id,
  );

  // 4. Invitee registration + authentication (separate connection)
  const inviteeEmail = `${RandomGenerator.name(1).replace(/\s+/g, "").toLowerCase()}@example.com`;
  const invitee: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(inviteeConn, {
      body: {
        email: inviteeEmail,
        password: "invitee-pass-123",
        displayName: RandomGenerator.name(),
        href: "https://example.com/signup",
        referrer: "https://example.com/",
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(invitee);

  // 5. Owner adds invitee as collaborator (use ownerConn so that owner token is used)
  const collaborator: ITodoAppListCollaborator =
    await api.functional.todoApp.todoUser.lists.collaborators.create(
      ownerConn,
      {
        listId: createdList.id,
        body: {
          todoAppTodouserId: invitee.id,
          role: "read-write",
        } satisfies ITodoAppListCollaborator.ICreate,
      },
    );
  typia.assert(collaborator);

  // 6. Business assertions
  TestValidator.equals(
    "collaborator.listId matches created list",
    collaborator.listId,
    createdList.id,
  );
  TestValidator.equals(
    "collaborator.user id matches invitee",
    collaborator.user.id,
    invitee.id,
  );
  TestValidator.equals(
    "collaborator.addedBy id matches owner",
    collaborator.addedBy.id,
    owner.id,
  );
  TestValidator.equals(
    "collaborator.role is read-write",
    collaborator.role,
    "read-write",
  );

  // acceptedAt may be null or undefined depending on auto-accept policy
  TestValidator.predicate(
    "collaborator.acceptedAt is null or undefined",
    collaborator.acceptedAt === null || collaborator.acceptedAt === undefined,
  );

  // createdAt/updatedAt presence is ensured by typia.assert but add a sanity predicate
  TestValidator.predicate(
    "collaborator has createdAt",
    typeof collaborator.createdAt === "string" &&
      collaborator.createdAt.length > 0,
  );
  TestValidator.predicate(
    "collaborator has updatedAt",
    typeof collaborator.updatedAt === "string" &&
      collaborator.updatedAt.length > 0,
  );
}
