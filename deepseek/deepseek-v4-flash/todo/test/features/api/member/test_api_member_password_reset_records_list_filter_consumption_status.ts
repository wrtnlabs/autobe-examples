import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberPasswordReset";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_password_reset_records_list_filter_consumption_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      href: "https://example.com/join",
      referrer: "https://example.com/",
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppMember.IJoin,
  });
  // 2. Call with consumed=false — retrieves only active tokens
  const activePage = await api.functional.todoApp.member.password_resets.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        consumed: false,
      } satisfies ITodoAppMemberPasswordReset.IRequest,
    },
  );
  typia.assert(activePage);
  // 3. Call with consumed=true — retrieves only consumed or expired tokens
  const consumedPage =
    await api.functional.todoApp.member.password_resets.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          consumed: true,
        } satisfies ITodoAppMemberPasswordReset.IRequest,
      },
    );
  typia.assert(consumedPage);
  // 4. Call without consumed filter — retrieves all records
  const allPage = await api.functional.todoApp.member.password_resets.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppMemberPasswordReset.IRequest,
    },
  );
  typia.assert(allPage);
  // 5. Verify partitioning: active total + consumed total = unfiltered total
  TestValidator.equals(
    "sum of consumed=false and consumed=true records equals unfiltered total",
    activePage.pagination.records + consumedPage.pagination.records,
    allPage.pagination.records,
  );
}
