import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppInvitation";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodouserSession";

export async function test_api_invitations_create_by_owner(
  connection: api.IConnection,
) {
  // 1) Owner self-signup (creates account and sets Authorization header on connection)
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerPassword = "P@ssw0rd123"; // meets minimum length requirement

  const owner: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: {
        email: ownerEmail,
        password: ownerPassword,
        displayName: RandomGenerator.name(),
        href: "https://example.com",
        referrer: "https://referrer.example.com",
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(owner);

  // 2) Owner creates a todo list to invite collaborators to
  const listTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const listDescription = RandomGenerator.paragraph({ sentences: 5 });

  const list: ITodoAppList = await api.functional.todoApp.todoUser.lists.create(
    connection,
    {
      body: {
        title: listTitle,
        description: listDescription,
        visibility: "shared-invite-only",
      } satisfies ITodoAppList.ICreate,
    },
  );
  typia.assert(list);
  TestValidator.equals(
    "created list owner matches signer",
    list.owner.id,
    owner.id,
  );

  // 3) Owner creates an invitation for an external email
  const inviteeEmail = "invitee@example.com";
  const message = "Please join my list";

  const invitation: ITodoAppInvitation =
    await api.functional.todoApp.todoUser.lists.invitations.create(connection, {
      listId: list.id,
      body: {
        invitee_email: inviteeEmail,
        message,
      } satisfies ITodoAppInvitation.ICreate,
    });
  typia.assert(invitation);

  // Business rule validations
  TestValidator.equals(
    "invitee_email preserved",
    invitation.invitee_email,
    inviteeEmail,
  );
  TestValidator.equals("state is pending", invitation.state, "pending");
  TestValidator.equals(
    "inviter id matches owner id",
    invitation.inviter.id,
    owner.id,
  );
  TestValidator.predicate(
    "invite_code present and non-empty",
    typeof invitation.invite_code === "string" &&
      invitation.invite_code.length > 0,
  );

  // Timestamps: created_at present and expires_at in the future (approx 14 days)
  TestValidator.predicate(
    "created_at is a valid ISO datetime",
    typeof invitation.created_at === "string" &&
      !Number.isNaN(new Date(invitation.created_at).getTime()),
  );

  TestValidator.predicate(
    "expires_at is in the future",
    typeof invitation.expires_at === "string" &&
      new Date(invitation.expires_at).getTime() > Date.now(),
  );

  // Ensure expires_at is after created_at
  TestValidator.predicate(
    "expires_at after created_at",
    new Date(invitation.expires_at).getTime() >
      new Date(invitation.created_at).getTime(),
  );

  // Note: Audit/log side-effects are described in the API docs but not
  // directly observable via the provided SDK functions. Therefore, log/audit
  // assertions are omitted in this test.
}
