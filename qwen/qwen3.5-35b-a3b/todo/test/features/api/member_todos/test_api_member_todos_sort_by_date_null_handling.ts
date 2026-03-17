import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import type { IMultiUserTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppTodo";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_todos_sort_by_date_null_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IMultiUserTodoAppMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: typia.random<IMultiUserTodoAppMember.IJoin>(),
    });
  typia.assert(member);
  // 2. Test sorting by start_date ascending with null handling
  const sortStartDateAsc: IPageIMultiUserTodoAppTodo.ISummary =
    await api.functional.multiUserTodoApp.member.todos.index(memberConnection, {
      body: {
        sortBy: "startDate",
        sortOrder: "asc",
      } satisfies IMultiUserTodoAppTodo.IRequest,
    });
  typia.assert(sortStartDateAsc);
  // 3. Test sorting by due_date descending with null handling
  const sortDueDateDesc: IPageIMultiUserTodoAppTodo.ISummary =
    await api.functional.multiUserTodoApp.member.todos.index(memberConnection, {
      body: {
        sortBy: "dueDate",
        sortOrder: "desc",
      } satisfies IMultiUserTodoAppTodo.IRequest,
    });
  typia.assert(sortDueDateDesc);
  // 4. Validate sorting behavior - NULLs should appear last
  // For startDate ascending: check that null dates are at the end
  const startDateAscData = sortStartDateAsc.data;
  const hasNullInMiddle = ArrayUtil.has(
    startDateAscData.slice(0, -1),
    (todo) => todo.start_date === null,
  );
  TestValidator.predicate(
    "start_date asc: no NULLs in middle positions",
    !hasNullInMiddle,
  );
  // For dueDate descending: check that null dates are at the end
  const dueDateDescData = sortDueDateDesc.data;
  const hasDueNullInMiddle = ArrayUtil.has(
    dueDateDescData.slice(0, -1),
    (todo) => todo.due_date === null,
  );
  TestValidator.predicate(
    "due_date desc: no NULLs in middle positions",
    !hasDueNullInMiddle,
  );
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current",
    sortStartDateAsc.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    sortStartDateAsc.pagination.limit > 0,
  );
  TestValidator.equals(
    "pagination records count",
    sortStartDateAsc.pagination.records,
    sortStartDateAsc.data.length,
  );
  TestValidator.equals(
    "pagination current",
    sortDueDateDesc.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    sortDueDateDesc.pagination.limit > 0,
  );
  TestValidator.equals(
    "pagination records count",
    sortDueDateDesc.pagination.records,
    sortDueDateDesc.data.length,
  );
}
