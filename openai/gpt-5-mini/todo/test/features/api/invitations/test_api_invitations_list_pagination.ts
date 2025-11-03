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

export async function test_api_invitations_list_pagination(
  connection: api.IConnection,
) {
  /**
   * E2E: Invitations listing pagination and stable ordering
   *
   * Steps:
   *
   * 1. Register a new todoUser (owner) via POST /auth/todoUser/join
   * 2. Create a todo list for that owner via POST /todoApp/todoUser/lists
   * 3. Create four invitations for distinct emails via POST
   *    /todoApp/todoUser/lists/{listId}/invitations
   * 4. Query PATCH /todoApp/todoUser/lists/{listId}/invitations with
   *    page=1&pageSize=2 and page=2&pageSize=2
   * 5. Validate pagination metadata consistency and that the combined pages
   *    contain exactly the set of created invitations (no duplicates)
   */

  // 1. Owner registration
  const ownerEmail: string = typia.random<string & tags.Format<"email">>();
  const owner: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: {
        email: ownerEmail,
        password: "password123", // >= 8 chars
        displayName: RandomGenerator.name(),
        href: "https://example.com/", // valid URI
        referrer: "https://example.com/ref",
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(owner);

  // 2. Create a todo list owned by this user
  const list: ITodoAppList = await api.functional.todoApp.todoUser.lists.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        visibility: "shared-invite-only",
      } satisfies ITodoAppList.ICreate,
    },
  );
  typia.assert(list);

  // 3. Create four invitations targeting distinct emails
  const inviteeEmails: (string & tags.Format<"email">)[] = ArrayUtil.repeat(
    4,
    () => typia.random<string & tags.Format<"email">>(),
  );

  const createdInvitations: ITodoAppInvitation[] = [];
  await ArrayUtil.asyncForEach(inviteeEmails, async (email) => {
    const invitation: ITodoAppInvitation =
      await api.functional.todoApp.todoUser.lists.invitations.create(
        connection,
        {
          listId: list.id,
          body: {
            inviteeEmail: email,
            message: `Invitation for ${email}`,
          } satisfies ITodoAppInvitation.ICreate,
        },
      );
    typia.assert(invitation);
    createdInvitations.push(invitation);
  });

  // Sanity: we created four invitations
  TestValidator.equals(
    "created invitations count",
    createdInvitations.length,
    4,
  );

  // 4. Request page 1 (page=1, pageSize=2)
  const page1: IPageITodoAppInvitation.ISummary =
    await api.functional.todoApp.todoUser.lists.invitations.index(connection, {
      listId: list.id,
      body: {
        page: 1,
        pageSize: 2,
      } satisfies ITodoAppInvitation.IRequest,
    });
  typia.assert(page1);

  // Validations for page 1
  TestValidator.equals(
    "page 1 current equals requested",
    page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit equals requested pageSize",
    page1.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "page 1 returns up to pageSize items",
    page1.data.length === 2,
  );

  // 5. Request page 2 (page=2, pageSize=2)
  const page2: IPageITodoAppInvitation.ISummary =
    await api.functional.todoApp.todoUser.lists.invitations.index(connection, {
      listId: list.id,
      body: {
        page: 2,
        pageSize: 2,
      } satisfies ITodoAppInvitation.IRequest,
    });
  typia.assert(page2);

  // Validations for page 2
  TestValidator.equals(
    "page 2 current equals requested",
    page2.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit equals requested pageSize",
    page2.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "page 2 returns up to pageSize items",
    page2.data.length === 2,
  );

  // Pagination metadata consistency checks
  TestValidator.equals(
    "pagination total records consistent across pages",
    page1.pagination.records,
    page2.pagination.records,
  );
  TestValidator.equals(
    "pagination limit consistent across pages",
    page1.pagination.limit,
    page2.pagination.limit,
  );

  // Combined results
  const combined: ITodoAppInvitation.ISummary[] = [
    ...page1.data,
    ...page2.data,
  ];

  // 6. Combined set contains all created invitations and no duplicates
  const createdIds = createdInvitations.map((i) => i.id);
  const combinedIds = combined.map((c) => c.id);

  // Check combined length equals total records reported by pagination
  TestValidator.equals(
    "combined length equals pagination.records",
    combined.length,
    page1.pagination.records,
  );

  // Every created id must be present in combined results
  TestValidator.predicate(
    "combined results include all created invitations",
    createdIds.every((id) => combinedIds.includes(id)),
  );

  // No duplicates in combined results
  const uniqueCombined = Array.from(new Set(combinedIds));
  TestValidator.equals(
    "no duplicate ids across combined pages",
    uniqueCombined.length,
    combinedIds.length,
  );

  // Optional: ensure pages together cover the same number of records as created
  TestValidator.equals(
    "pagination.records equals created count",
    page1.pagination.records,
    createdInvitations.length,
  );
}
