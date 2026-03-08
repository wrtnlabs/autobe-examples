import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_trash_with_filtering_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Register member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberSession = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ITodoAppMemberSession.IJoin,
  });
  typia.assert(memberSession);
  // Create member connection with token
  const memberAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberSession.token.access,
    },
  };
  // 1. Test trash list with completion status filter - completed only
  const completedTrashResponse =
    await api.functional.todoApp.member.trash.index(memberAuthConnection, {
      body: {
        is_complete: "true",
        sort_by: "created_at",
        sort_order: "desc",
        limit: 10,
        offset: 0,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(completedTrashResponse);
  // 2. Test trash list with completion status filter - incomplete only
  const incompleteTrashResponse =
    await api.functional.todoApp.member.trash.index(memberAuthConnection, {
      body: {
        is_complete: "false",
        sort_by: "created_at",
        sort_order: "desc",
        limit: 10,
        offset: 0,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(incompleteTrashResponse);
  // 3. Test trash list with completion status filter - all
  const allTrashResponse = await api.functional.todoApp.member.trash.index(
    memberAuthConnection,
    {
      body: {
        is_complete: "all",
        sort_by: "created_at",
        sort_order: "desc",
        limit: 10,
        offset: 0,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(allTrashResponse);
  TestValidator.equals(
    "all trash items count",
    allTrashResponse.data.length,
    allTrashResponse.pagination.records,
  );
  // 4. Test sorting by created_at ascending
  const createdAtAscResponse = await api.functional.todoApp.member.trash.index(
    memberAuthConnection,
    {
      body: {
        is_complete: "all",
        sort_by: "created_at",
        sort_order: "asc",
        limit: 10,
        offset: 0,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(createdAtAscResponse);
  // 5. Test sorting by start_date descending
  const startDateDescResponse = await api.functional.todoApp.member.trash.index(
    memberAuthConnection,
    {
      body: {
        is_complete: "all",
        sort_by: "start_date",
        sort_order: "desc",
        limit: 10,
        offset: 0,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(startDateDescResponse);
  // 6. Test sorting by due_date ascending
  const dueDateAscResponse = await api.functional.todoApp.member.trash.index(
    memberAuthConnection,
    {
      body: {
        is_complete: "all",
        sort_by: "due_date",
        sort_order: "asc",
        limit: 10,
        offset: 0,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(dueDateAscResponse);
  // 7. Test pagination with limit and offset
  const paginatedResponse1 = await api.functional.todoApp.member.trash.index(
    memberAuthConnection,
    {
      body: {
        is_complete: "all",
        sort_by: "created_at",
        sort_order: "desc",
        limit: 2,
        offset: 0,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(paginatedResponse1);
  TestValidator.equals(
    "page 1 count",
    paginatedResponse1.data.length,
    paginatedResponse1.pagination.limit,
  );
  TestValidator.equals("page 1 limit", paginatedResponse1.pagination.limit, 2);
  const paginatedResponse2 = await api.functional.todoApp.member.trash.index(
    memberAuthConnection,
    {
      body: {
        is_complete: "all",
        sort_by: "created_at",
        sort_order: "desc",
        limit: 2,
        offset: 2,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(paginatedResponse2);
  TestValidator.equals(
    "page 2 count",
    paginatedResponse2.data.length,
    paginatedResponse2.pagination.limit,
  );
  // 8. Test combined filters and sorting
  const combinedResponse = await api.functional.todoApp.member.trash.index(
    memberAuthConnection,
    {
      body: {
        is_complete: "true",
        sort_by: "due_date",
        sort_order: "desc",
        limit: 5,
        offset: 0,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(combinedResponse);
}
