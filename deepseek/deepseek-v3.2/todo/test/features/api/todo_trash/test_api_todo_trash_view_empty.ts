import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoTrashItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoTrashItem";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoTrashItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoTrashItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_todo_trash_view_empty(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Request trash list with pagination
  const trashList = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        page: 1 satisfies number as number,
        limit: 10 satisfies number as number,
      } satisfies ITodoAppTodoTrashItem.IRequest,
    },
  );
  typia.assert(trashList);
  // Validate pagination metadata
  TestValidator.equals(
    "page number should be 1",
    trashList.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should match request",
    trashList.pagination.limit,
    10,
  );
  TestValidator.equals(
    "total records should be 0",
    trashList.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages should be 0",
    trashList.pagination.pages,
    0,
  );
  // Validate empty data array
  TestValidator.equals("data array should be empty", trashList.data.length, 0);
}
