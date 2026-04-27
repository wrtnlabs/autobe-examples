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

export async function test_api_member_password_reset_records_list_filter_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new member to get authenticated session
  const memberConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(joinOutput);
  // 2. Call with wide date range covering all possible records
  const wideRangeResult =
    await api.functional.todoApp.member.password_resets.index(
      memberConnection,
      {
        body: {
          created_at_from: "2020-01-01T00:00:00Z",
          created_at_to: "2030-01-01T00:00:00Z",
        } satisfies ITodoAppMemberPasswordReset.IRequest,
      },
    );
  typia.assert(wideRangeResult);
  // 3. Call with future-only date range (out of range) — expect empty result
  const futureResult =
    await api.functional.todoApp.member.password_resets.index(
      memberConnection,
      {
        body: {
          created_at_from: "2099-01-01T00:00:00Z",
        } satisfies ITodoAppMemberPasswordReset.IRequest,
      },
    );
  typia.assert(futureResult);
  TestValidator.equals(
    "future range records count",
    futureResult.pagination.records,
    0,
  );
  TestValidator.equals("future range data empty", futureResult.data.length, 0);
  // 4. Call with only created_at_from (partial range, no upper bound)
  const partialRangeResult =
    await api.functional.todoApp.member.password_resets.index(
      memberConnection,
      {
        body: {
          created_at_from: "2020-01-01T00:00:00Z",
        } satisfies ITodoAppMemberPasswordReset.IRequest,
      },
    );
  typia.assert(partialRangeResult);
}
