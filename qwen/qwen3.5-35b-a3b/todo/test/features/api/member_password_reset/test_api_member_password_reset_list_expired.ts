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

export async function test_api_member_password_reset_list_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for testing
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IMultiUserTodoMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(member);
  // 2. Create new connection with token for authenticated requests
  const authConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${member.token.access}` },
  };
  // 3. List password reset requests with expired status filter
  const response: IPageIMultiUserTodoMemberPasswordReset.ISummary =
    await api.functional.multiUserTodo.member_password_resets.index(
      authConnection,
      {
        body: {
          member_id: member.id,
          status: "expired",
          page: 1,
          limit: 20,
        } satisfies IMultiUserTodoMemberPasswordReset.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate pagination structure
  TestValidator.equals("pagination current", response.pagination.current, 1);
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    response.pagination.pages >= 0,
  );
  // 5. Validate all returned items have expired status
  const now = new Date();
  for (const item of response.data) {
    const expiredAt = new Date(item.expired_at);
    TestValidator.predicate("expired_at <= current time", expiredAt <= now);
  }
  // 6. Validate all items belong to the member
  for (const item of response.data) {
    TestValidator.equals("item member_id matches", item.member.id, member.id);
  }
}
