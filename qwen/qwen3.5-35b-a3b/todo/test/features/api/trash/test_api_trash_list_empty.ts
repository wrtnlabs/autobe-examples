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

export async function test_api_trash_list_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create member-specific connection for trash listing
  const trashConnection: api.IConnection = { host: connection.host };
  const trashResponse: IPageIMultiUserTodoTodo.ISummary =
    await api.functional.multiUserTodo.member.trash.index(trashConnection, {
      body: {} satisfies IMultiUserTodoTodo.IRequest,
    });
  typia.assert(trashResponse);
  // 3. Verify data is empty array
  TestValidator.equals("trash data is empty", trashResponse.data, []);
  // 4. Verify pagination metadata
  TestValidator.equals(
    "current page is 1",
    trashResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit is 20 (default)",
    trashResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "total records is 0",
    trashResponse.pagination.records,
    0,
  );
  TestValidator.equals("total pages is 0", trashResponse.pagination.pages, 0);
}
