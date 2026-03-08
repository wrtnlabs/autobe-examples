import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_sessions_sort_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Generate session data for testing
  const sessionCount = 10;
  const sessions = ArrayUtil.repeat(sessionCount, (index) => ({
    id: typia.random<string & tags.Format<"uuid">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    created_at: new Date(
      Date.now() - (sessionCount - index) * 60000,
    ).toISOString(),
    expired_at: new Date(Date.now() + 86400000).toISOString(),
    status: "active" as const,
  }));
  // 3. First request: sort by created_at DESC with take: 5
  const firstRequest = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        sortBy: "created_at",
        sortOrder: "desc",
        take: 5,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(firstRequest);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current",
    firstRequest.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", firstRequest.pagination.limit, 5);
  TestValidator.equals(
    "pagination records",
    firstRequest.pagination.records,
    sessionCount,
  );
  TestValidator.equals(
    "pagination pages",
    firstRequest.pagination.pages,
    Math.ceil(sessionCount / 5),
  );
  // Validate first page data structure
  TestValidator.equals(
    "first page has 5 sessions",
    firstRequest.data.length,
    5,
  );
  // 4. Second request: use cursor with direction 'forward'
  const secondRequest = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        sortBy: "created_at",
        sortOrder: "desc",
        take: 5,
        cursor: firstRequest.data[0].id,
        direction: "forward",
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(secondRequest);
  // Validate second page metadata
  TestValidator.equals(
    "second page current",
    secondRequest.pagination.current,
    2,
  );
  TestValidator.equals("second page limit", secondRequest.pagination.limit, 5);
  TestValidator.equals(
    "second page records",
    secondRequest.pagination.records,
    sessionCount,
  );
  TestValidator.equals(
    "second page pages",
    secondRequest.pagination.pages,
    Math.ceil(sessionCount / 5),
  );
  TestValidator.equals(
    "second page has 5 sessions",
    secondRequest.data.length,
    5,
  );
  // 5. Third request: use cursor from second page with direction 'backward'
  const backRequest = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        sortBy: "created_at",
        sortOrder: "desc",
        take: 5,
        cursor: secondRequest.data[0].id,
        direction: "backward",
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(backRequest);
  // Validate backward pagination returns previous page
  TestValidator.equals(
    "backward page current",
    backRequest.pagination.current,
    2,
  );
  // 6. Verify session fields in all responses
  const validateSessionFields = (
    session: ITodoAppMemberSession.ISummary,
    index: number,
  ) => {
    typia.assert(session);
    TestValidator.predicate(
      `session ${index} status valid`,
      session.status === "active" || session.status === "expired",
    );
  };
  firstRequest.data.forEach(validateSessionFields);
  secondRequest.data.forEach(validateSessionFields);
  backRequest.data.forEach(validateSessionFields);
  // 7. Verify sorting - sessions should be sorted by created_at DESC
  for (let i = 0; i < firstRequest.data.length - 1; i++) {
    TestValidator.predicate(
      `first page session ${i} created_at >= session ${i + 1} created_at`,
      firstRequest.data[i].created_at >= firstRequest.data[i + 1].created_at,
    );
  }
}
