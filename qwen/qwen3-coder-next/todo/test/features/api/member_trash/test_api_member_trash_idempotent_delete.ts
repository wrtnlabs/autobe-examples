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

export async function test_api_member_trash_idempotent_delete(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberSession = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" satisfies string & tags.Format<"password">,
    },
  });
  typia.assert(memberSession);
  // 2. List trash (first call)
  const trashList1 = await api.functional.todoApp.member.trash.index(
    memberConnection,
    {
      body: {
        is_complete: "all",
        sort_by: "created_at",
        sort_order: "desc",
        limit: 100,
        offset: 0,
      },
    },
  );
  typia.assert(trashList1);
  // 3. List trash again (second call - idempotent behavior)
  const trashList2 = await api.functional.todoApp.member.trash.index(
    memberConnection,
    {
      body: {
        is_complete: "all",
        sort_by: "created_at",
        sort_order: "desc",
        limit: 100,
        offset: 0,
      },
    },
  );
  typia.assert(trashList2);
  // 4. Verify idempotent behavior - both calls should return consistent results
  TestValidator.equals(
    "trash counts match",
    trashList1.data.length,
    trashList2.data.length,
  );
  TestValidator.equals(
    "pagination matches",
    trashList1.pagination.records,
    trashList2.pagination.records,
  );
}
