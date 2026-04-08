import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberPasswordReset";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_password_reset_list_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account without requesting any password reset
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/join",
      referrer: "https://example.com/register",
    },
  });
  typia.assert(member);
  // 2. List password reset requests - should return empty results
  const result =
    await api.functional.multiUserTodo.member_password_resets.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IMultiUserTodoMemberPasswordReset.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate empty result response
  TestValidator.equals("current page", result.pagination.current, 1);
  TestValidator.equals("page limit", result.pagination.limit, 20);
  TestValidator.equals("records count", result.pagination.records, 0);
  TestValidator.equals("pages count", result.pagination.pages, 0);
  TestValidator.equals("data array length", result.data.length, 0);
  TestValidator.predicate("data is empty array", result.data.length === 0);
}
