import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppInvitation";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodouserSession";

export async function test_api_invitation_retrieval_by_owner(
  connection: api.IConnection,
) {
  // 1) Owner signup (join)
  const ownerEmail = `owner.${RandomGenerator.alphaNumeric(6)}@example.com`;
  const owner = await api.functional.auth.todoUser.join(connection, {
    body: {
      email: ownerEmail,
      password: "StrongPassw0rd",
      href: "https://example.com/signup",
      referrer: "https://example.com",
      displayName: RandomGenerator.name(),
    } satisfies ITodoAppTodoUser.ICreate,
  });
  typia.assert(owner);

  // 2) Owner creates a todo list
  const list = await api.functional.todoApp.todoUser.lists.create(connection, {
    body: {
      title: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 3,
        wordMax: 8,
      }),
      description: RandomGenerator.paragraph({ sentences: 6 }),
      visibility: "shared-invite-only",
    } satisfies ITodoAppList.ICreate,
  });
  typia.assert(list);

  // 3) Owner creates an invitation for the list (external email)
  const inviteeEmail = `invitee.${RandomGenerator.alphaNumeric(6)}@example.com`;
  const invitation =
    await api.functional.todoApp.todoUser.lists.invitations.create(connection, {
      listId: list.id,
      body: {
        invitee_email: inviteeEmail,
        message: "Please join my list",
      } satisfies ITodoAppInvitation.ICreate,
    });
  typia.assert(invitation);

  // 4) Owner retrieves the invitation
  const got: ITodoAppInvitation =
    await api.functional.todoApp.todoUser.lists.invitations.at(connection, {
      listId: list.id,
      invitationId: invitation.id,
    });
  typia.assert(got);

  // 5) Business validations (actual-first, expected-second)
  TestValidator.equals(
    "invitation id matches created id",
    got.id,
    invitation.id,
  );
  TestValidator.equals(
    "invitation belongs to created list",
    got.list.id,
    list.id,
  );
  TestValidator.equals(
    "invitation state matches created state",
    got.state,
    invitation.state,
  );
  TestValidator.equals(
    "invitee email matches create payload",
    got.invitee_email,
    inviteeEmail,
  );

  // Owner should see the full invite_code (not redacted)
  TestValidator.predicate(
    "owner receives invite_code (non-empty string)",
    typeof got.invite_code === "string" && got.invite_code.length > 0,
  );

  // expires_at, created_at and updated_at should be present and RFC3339-parseable
  TestValidator.predicate(
    "expires_at is RFC3339 formatted",
    (() => {
      try {
        return new Date(got.expires_at).toISOString() === got.expires_at;
      } catch {
        return false;
      }
    })(),
  );

  TestValidator.predicate(
    "created_at is RFC3339 formatted",
    (() => {
      try {
        return new Date(got.created_at).toISOString() === got.created_at;
      } catch {
        return false;
      }
    })(),
  );

  TestValidator.predicate(
    "updated_at is RFC3339 formatted",
    (() => {
      try {
        return new Date(got.updated_at).toISOString() === got.updated_at;
      } catch {
        return false;
      }
    })(),
  );
}
