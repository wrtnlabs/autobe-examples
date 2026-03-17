import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import type { IMultiUserTodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_sessions_filter_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with valid credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoAppMember.IJoin,
  });
  typia.assert(joinOutput);
  // 2. Create authenticated connection with access token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${joinOutput.token.access}`,
    },
  };
  // 3. Request to view sessions with status filter set to 'expired'
  const response = await api.functional.multiUserTodoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        status: "expired",
        page: 1,
        limit: 10,
      } satisfies IMultiUserTodoAppMemberSession.IRequest,
    },
  );
  typia.assert(response);
  // 4. Verify pagination metadata is correct
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    response.pagination.pages,
    response.pagination.records === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // 5. Verify data array is returned
  TestValidator.predicate("data array is array", Array.isArray(response.data));
  // 6. If sessions exist, verify each session's expired_at timestamp is in the past
  if (response.data.length > 0) {
    const serverTime = new Date();
    for (const session of response.data) {
      const safeSession = typia.assert(session);
      const expiredAt = new Date(safeSession.expired_at);
      TestValidator.predicate(
        "session expired_at is in the past",
        expiredAt < serverTime,
      );
    }
  }
  // 7. Verify filtering respects pagination limits
  TestValidator.predicate(
    "data length respects limit",
    response.data.length <= response.pagination.limit,
  );
}
