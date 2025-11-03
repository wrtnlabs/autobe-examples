import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppInvitation";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodouserSession";

export async function test_api_invitation_accept_by_invitee(
  connection: api.IConnection,
) {
  // 1) Owner signs up
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const owner = await api.functional.auth.todoUser.join(connection, {
    body: {
      email: ownerEmail,
      password: "Password01!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      displayName: RandomGenerator.name(),
    } satisfies ITodoAppTodoUser.ICreate,
  });
  typia.assert(owner);

  // 2) Owner creates a list
  const list: ITodoAppList = await api.functional.todoApp.todoUser.lists.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 10,
        }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        visibility: "shared-invite-only",
      } satisfies ITodoAppList.ICreate,
    },
  );
  typia.assert(list);

  // 3) Owner creates an invitation targeting an invitee email (invitee not yet registered)
  const inviteeEmail = typia.random<string & tags.Format<"email">>();
  const invitation: ITodoAppInvitation =
    await api.functional.todoApp.todoUser.lists.invitations.create(connection, {
      listId: list.id,
      body: {
        invitee_email: inviteeEmail,
        message: "Please join my list",
      } satisfies ITodoAppInvitation.ICreate,
    });
  typia.assert(invitation);

  // 4) Invitee signs up (this will switch the connection's Authorization to invitee)
  const invitee = await api.functional.auth.todoUser.join(connection, {
    body: {
      email: inviteeEmail,
      password: "Password01!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      displayName: RandomGenerator.name(),
    } satisfies ITodoAppTodoUser.ICreate,
  });
  typia.assert(invitee);

  // 5) Invitee accepts the invitation
  const updated: ITodoAppInvitation =
    await api.functional.todoApp.todoUser.lists.invitations.update(connection, {
      listId: list.id,
      invitationId: invitation.id,
      body: {
        state: "accepted",
      } satisfies ITodoAppInvitation.IUpdate,
    });
  typia.assert(updated);

  // 6) Assertions: state, accepted_at, and invitee linkage
  TestValidator.equals(
    "invitation state is 'accepted'",
    updated.state,
    "accepted",
  );
  TestValidator.predicate(
    "invitation has accepted_at timestamp",
    updated.accepted_at !== null && updated.accepted_at !== undefined,
  );

  // If the invitee summary is populated, ensure it matches the newly created invitee
  if (updated.invitee !== null && updated.invitee !== undefined) {
    const linked = typia.assert<ITodoAppTodoUser.ISummary>(updated.invitee);
    TestValidator.equals(
      "invitee id linked to invitation",
      linked.id,
      invitee.id,
    );
  } else {
    TestValidator.predicate("invitee summary present after acceptance", false);
  }
}
