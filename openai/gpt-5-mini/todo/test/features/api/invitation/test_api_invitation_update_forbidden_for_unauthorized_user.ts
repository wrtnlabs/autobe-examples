import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppInvitation";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodouserSession";

export async function test_api_invitation_update_forbidden_for_unauthorized_user(
  connection: api.IConnection,
) {
  // 1) Owner: create account
  const ownerConn: IConnection = { ...connection, headers: {} };
  const owner: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(ownerConn, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(owner);

  // 2) Owner: create list
  const list: ITodoAppList = await api.functional.todoApp.todoUser.lists.create(
    ownerConn,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        visibility: "shared-invite-only",
      } satisfies ITodoAppList.ICreate,
    },
  );
  typia.assert(list);

  // 3) Owner: create invitation targeting an external email (not the unrelated user)
  const externalInviteeEmail = typia.random<string & tags.Format<"email">>();
  const invitation: ITodoAppInvitation =
    await api.functional.todoApp.todoUser.lists.invitations.create(ownerConn, {
      listId: list.id,
      body: {
        invitee_email: externalInviteeEmail,
        message: "Please join my list",
      } satisfies ITodoAppInvitation.ICreate,
    });
  typia.assert(invitation);

  // Ensure initial state is 'pending'
  TestValidator.equals(
    "initial invitation state is pending",
    invitation.state,
    "pending",
  );

  // 4) Create unrelated user
  const unrelatedConn: IConnection = { ...connection, headers: {} };
  const unrelated: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(unrelatedConn, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(unrelated);

  // 5) Using the unrelated user's token, attempt to update the invitation -> expect 403/forbidden
  await TestValidator.httpError(
    "unauthorized user cannot update another list's invitation",
    403,
    async () => {
      await api.functional.todoApp.todoUser.lists.invitations.update(
        unrelatedConn,
        {
          listId: list.id,
          invitationId: invitation.id,
          body: {
            state: "accepted",
          } satisfies ITodoAppInvitation.IUpdate,
        },
      );
    },
  );

  // 6) Confirm owner can update (prove authorization boundary) and that initial state was unchanged until owner acted
  const updatedByOwner: ITodoAppInvitation =
    await api.functional.todoApp.todoUser.lists.invitations.update(ownerConn, {
      listId: list.id,
      invitationId: invitation.id,
      body: {
        state: "revoked",
      } satisfies ITodoAppInvitation.IUpdate,
    });
  typia.assert(updatedByOwner);
  TestValidator.equals(
    "owner can revoke the invitation",
    updatedByOwner.state,
    "revoked",
  );
}
