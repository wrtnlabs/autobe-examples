import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_trash_list_with_deleted_todos(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account and get authentication
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create member-specific connection with authentication token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${memberAuth.token.access}`,
    },
  };
  // 3. Test trash list with default parameters (no filters)
  const trashDefault =
    await api.functional.multiUserTodo.member.todos.trash.index(
      memberConnection,
      {
        body: {} satisfies IMultiUserTodoTodo.IRequest,
      },
    );
  typia.assert(trashDefault);
  // 4. Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    trashDefault.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is number",
    typeof trashDefault.pagination.current === "number",
  );
  TestValidator.predicate(
    "limit is number",
    typeof trashDefault.pagination.limit === "number",
  );
  TestValidator.predicate(
    "records is number",
    typeof trashDefault.pagination.records === "number",
  );
  TestValidator.predicate(
    "pages is number",
    typeof trashDefault.pagination.pages === "number",
  );
  TestValidator.predicate("data is array", Array.isArray(trashDefault.data));
  // 5. Test trash list with complete status filter
  const trashComplete =
    await api.functional.multiUserTodo.member.todos.trash.index(
      memberConnection,
      {
        body: {
          status: "complete",
        } satisfies IMultiUserTodoTodo.IRequest,
      },
    );
  typia.assert(trashComplete);
  TestValidator.predicate(
    "complete filter returns array",
    Array.isArray(trashComplete.data),
  );
  // 6. Test trash list with incomplete status filter
  const trashIncomplete =
    await api.functional.multiUserTodo.member.todos.trash.index(
      memberConnection,
      {
        body: {
          status: "incomplete",
        } satisfies IMultiUserTodoTodo.IRequest,
      },
    );
  typia.assert(trashIncomplete);
  TestValidator.predicate(
    "incomplete filter returns array",
    Array.isArray(trashIncomplete.data),
  );
  // 7. Test trash list with all status filter
  const trashAll = await api.functional.multiUserTodo.member.todos.trash.index(
    memberConnection,
    {
      body: {
        status: "all",
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(trashAll);
  TestValidator.predicate(
    "all filter returns array",
    Array.isArray(trashAll.data),
  );
  // 8. Test trash list with sortBy createdAt descending
  const trashSortCreatedDesc =
    await api.functional.multiUserTodo.member.todos.trash.index(
      memberConnection,
      {
        body: {
          sortBy: "createdAt",
          sortDirection: "desc",
        } satisfies IMultiUserTodoTodo.IRequest,
      },
    );
  typia.assert(trashSortCreatedDesc);
  // 9. Test trash list with sortBy createdAt ascending
  const trashSortCreatedAsc =
    await api.functional.multiUserTodo.member.todos.trash.index(
      memberConnection,
      {
        body: {
          sortBy: "createdAt",
          sortDirection: "asc",
        } satisfies IMultiUserTodoTodo.IRequest,
      },
    );
  typia.assert(trashSortCreatedAsc);
  // 10. Test trash list with sortBy startedAt
  const trashSortStarted =
    await api.functional.multiUserTodo.member.todos.trash.index(
      memberConnection,
      {
        body: {
          sortBy: "startedAt",
          sortDirection: "desc",
        } satisfies IMultiUserTodoTodo.IRequest,
      },
    );
  typia.assert(trashSortStarted);
  // 11. Test trash list with sortBy dueAt
  const trashSortDue =
    await api.functional.multiUserTodo.member.todos.trash.index(
      memberConnection,
      {
        body: {
          sortBy: "dueAt",
          sortDirection: "asc",
        } satisfies IMultiUserTodoTodo.IRequest,
      },
    );
  typia.assert(trashSortDue);
  // 12. Test trash list with pagination parameters
  const trashPaginated =
    await api.functional.multiUserTodo.member.todos.trash.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoTodo.IRequest,
      },
    );
  typia.assert(trashPaginated);
  TestValidator.equals("page number", trashPaginated.pagination.current, 1);
  TestValidator.equals("limit", trashPaginated.pagination.limit, 10);
  // 13. Validate all responses have consistent structure
  TestValidator.predicate(
    "default has pagination",
    trashDefault.pagination !== undefined,
  );
  TestValidator.predicate(
    "complete has pagination",
    trashComplete.pagination !== undefined,
  );
  TestValidator.predicate(
    "incomplete has pagination",
    trashIncomplete.pagination !== undefined,
  );
  TestValidator.predicate(
    "all has pagination",
    trashAll.pagination !== undefined,
  );
}
