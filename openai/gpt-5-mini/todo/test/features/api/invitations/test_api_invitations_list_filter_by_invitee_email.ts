import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppInvitation";
import type { ITodoAppInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppInvitation";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodouserSession";

export async function test_api_invitations_list_filter_by_invitee_email(
  connection: api.IConnection,
) {
  /**
   * Purpose: Validate that the list owner can filter invitations by
   * inviteeEmail and receive only matching invitation summaries with correct
   * pagination metadata.
   *
   * Steps:
   *
   * 1. Create an owner account (auth.todoUser.join)
   * 2. Create a todo list owned by the account (todoApp.todoUser.lists.create)
   * 3. Create three invitations for that list with different inviteeEmail values
   * 4. Call PATCH /todoApp/todoUser/lists/{listId}/invitations with inviteeEmail
   *    filter
   * 5. Assert that only matching invitations are returned and pagination info is
   *    present
   */

  // 1) Owner signup (use typia.random for valid email/uri formats)
  const ownerEmail: string = typia.random<string & tags.Format<"email">>();
  const owner: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: {
        email: ownerEmail,
        password: "StrongPassw0rd!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(owner);

  // 2) Create a todo list owned by the authenticated user
  const list: ITodoAppList = await api.functional.todoApp.todoUser.lists.create(
    connection,
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

  // Helper to create an invitation and return the created invitation
  const createInvitation = async (inviteeEmail: string, message?: string) => {
    const invitation: ITodoAppInvitation =
      await api.functional.todoApp.todoUser.lists.invitations.create(
        connection,
        {
          listId: list.id,
          body: {
            inviteeEmail,
            message: message ?? null,
          } satisfies ITodoAppInvitation.ICreate,
        },
      );
    typia.assert(invitation);
    return invitation;
  };

  // 3) Create three invitations
  const alice = await createInvitation("alice@example.com", "Invite Alice");
  const bob = await createInvitation("bob@example.com", "Invite Bob");
  const aliceTag = await createInvitation(
    "alice+tag@example.com",
    "Invite Alice+tag",
  );

  // Sanity asserts: ensure created invitee emails are present on returned objects
  typia.assert(alice);
  typia.assert(bob);
  typia.assert(aliceTag);

  // 4) Call the index endpoint with inviteeEmail filter for exact match 'alice@example.com'
  const page: IPageITodoAppInvitation.ISummary =
    await api.functional.todoApp.todoUser.lists.invitations.index(connection, {
      listId: list.id,
      body: {
        inviteeEmail: "alice@example.com",
        page: 1,
        pageSize: 20,
      } satisfies ITodoAppInvitation.IRequest,
    });
  // Validate response shape
  typia.assert(page);

  // 5) Business-level validations
  TestValidator.predicate(
    "pagination current is at least 1",
    page.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    page.pagination.limit > 0,
  );
  TestValidator.predicate("data should be an array", Array.isArray(page.data));
  TestValidator.predicate(
    "data contains at least one matching invitation",
    page.data.length >= 1,
  );

  // Ensure all returned invitations match the filter exactly and non-matching are excluded
  TestValidator.predicate(
    "all returned invitations have inviteeEmail === 'alice@example.com'",
    page.data.every((it) => it.inviteeEmail === "alice@example.com"),
  );

  TestValidator.predicate(
    "no bob invitation present",
    page.data.every((it) => it.inviteeEmail !== "bob@example.com"),
  );

  TestValidator.predicate(
    "alice+tag@example.com not included for exact filter",
    page.data.every((it) => it.inviteeEmail !== "alice+tag@example.com"),
  );
}
