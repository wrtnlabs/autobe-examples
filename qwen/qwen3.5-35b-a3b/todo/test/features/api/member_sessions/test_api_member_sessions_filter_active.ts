import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_sessions_filter_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and establish session
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  // 2. Call member-sessions endpoint with active status filter
  const request: IMultiUserTodoMemberSession.IRequest = {
    status: "active",
    page: 1,
    limit: 20,
  };
  const response: IPageIMultiUserTodoMemberSession.ISummary =
    await api.functional.multiUserTodo.member_sessions.index(memberConnection, {
      body: request,
    });
  typia.assert(response);
  // 3. Validate response structure
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 20", response.pagination.limit, 20);
  // 4. Verify all sessions are actually active (expired_at > current time)
  const now = new Date();
  const allActive = response.data.every((session) => {
    const expiredAt = new Date(session.expired_at);
    return expiredAt > now;
  });
  TestValidator.predicate("all sessions are active", allActive);
  // 5. Verify pagination reflects filtered count
  TestValidator.equals(
    "total_count matches filtered data length",
    response.pagination.records,
    response.data.length,
  );
  // 6. Verify default sort order (created_at descending)
  if (response.data.length > 1) {
    const isSorted = response.data.every((session, index) => {
      if (index === 0) return true;
      const prev = new Date(response.data[index - 1].created_at);
      const curr = new Date(session.created_at);
      return prev >= curr;
    });
    TestValidator.predicate("sessions sorted by created_at desc", isSorted);
  }
}
