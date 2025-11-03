import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppInvitation";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodouserSession";

export async function test_api_invitation_retrieval_forbidden_for_unauthorized_user(
  connection: api.IConnection,
) {
  // 1. Create separate connection clones for owner and attacker to maintain
  //    independent Authorization tokens without touching the original
  //    connection.headers.
  const ownerConn: api.IConnection = { ...connection, headers: {} };
  const attackerConn: api.IConnection = { ...connection, headers: {} };

  // 2. Register owner account
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const owner = await api.functional.auth.todoUser.join(ownerConn, {
    body: {
      email: ownerEmail,
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppTodoUser.ICreate,
  });
  typia.assert(owner);

  // 3. Owner creates a list
  const list = await api.functional.todoApp.todoUser.lists.create(ownerConn, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 6 }),
      visibility: "shared-invite-only",
    } satisfies ITodoAppList.ICreate,
  });
  typia.assert(list);
  TestValidator.predicate(
    "created list has id",
    typeof list.id === "string" && list.id.length > 0,
  );

  // 4. Owner creates an invitation (external invite via email)
  const inviteeEmail = typia.random<string & tags.Format<"email">>();
  const invitation =
    await api.functional.todoApp.todoUser.lists.invitations.create(ownerConn, {
      listId: list.id,
      body: {
        invitee_email: inviteeEmail,
        message: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies ITodoAppInvitation.ICreate,
    });
  typia.assert(invitation);

  // Save invitation id for subsequent retrieval attempts
  const invitationId = invitation.id;
  TestValidator.predicate(
    "invitation id present",
    typeof invitationId === "string" && invitationId.length > 0,
  );

  // 5. Register an unrelated attacker account
  const attackerEmail = typia.random<string & tags.Format<"email">>();
  const attacker = await api.functional.auth.todoUser.join(attackerConn, {
    body: {
      email: attackerEmail,
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppTodoUser.ICreate,
  });
  typia.assert(attacker);

  // 6. Attempt to retrieve invitation with attacker -- expect 403 or 404
  await TestValidator.httpError(
    "unauthorized user cannot retrieve invitation",
    [403, 404],
    async () => {
      await api.functional.todoApp.todoUser.lists.invitations.at(attackerConn, {
        listId: list.id,
        invitationId,
      });
    },
  );

  // 7. Control: owner can still retrieve the invitation and sees invite_code
  const invitationByOwner =
    await api.functional.todoApp.todoUser.lists.invitations.at(ownerConn, {
      listId: list.id,
      invitationId,
    });
  typia.assert(invitationByOwner as ITodoAppInvitation);

  TestValidator.predicate(
    "owner receives invite_code and correct list association",
    typeof invitationByOwner.invite_code === "string" &&
      invitationByOwner.invite_code.length > 0 &&
      invitationByOwner.list.id === list.id,
  );
}
