import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUserSession";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

export async function test_api_admin_user_sessions_query_by_admin(
  connection: api.IConnection,
) {
  // Admin registration (main admin and another for permission negative test)
  const adminMainReq = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ITodoListAdmin.IJoin;
  const adminMain = await api.functional.auth.admin.join(connection, {
    body: adminMainReq,
  });
  typia.assert(adminMain);
  const adminMainId = adminMain.id;

  const adminOtherReq = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ITodoListAdmin.IJoin;
  const adminOther = await api.functional.auth.admin.join(connection, {
    body: adminOtherReq,
  });
  typia.assert(adminOther);

  // As adminMain, perform sessions query on adminMain's userId
  // Use filter, pagination, and sorting
  const req1 = {
    page: 1 as number,
    limit: 10 as number,
    sort_by: RandomGenerator.pick(["created_at", "expired_at"] as const),
    sort_order: RandomGenerator.pick(["asc", "desc"] as const),
    // skip 'ip' filter for generality
  } satisfies ITodoListUserSession.IRequest;
  const page1 = await api.functional.todoList.admin.users.sessions.index(
    connection,
    {
      userId: adminMainId,
      body: req1,
    },
  );
  typia.assert(page1);
  TestValidator.equals(
    "userId in sessions belongs to queried user",
    page1.data.length === 0 ? [] : page1.data.map((x) => x.user_id),
    page1.data.length === 0 ? [] : Array(page1.data.length).fill(adminMainId),
  );
  if (page1.data.length > 0) {
    const s = page1.data[0];
    typia.assert<ITodoListUserSession>(s);
    TestValidator.predicate(
      "session includes audit fields",
      typeof s.ip === "string" &&
        typeof s.href === "string" &&
        typeof s.referrer === "string" &&
        typeof s.created_at === "string",
    );
  }

  // Pagination test - limit 1
  const reqPage = {
    page: 1 as number,
    limit: 1 as number,
  } satisfies ITodoListUserSession.IRequest;
  const pageLimited = await api.functional.todoList.admin.users.sessions.index(
    connection,
    {
      userId: adminMainId,
      body: reqPage,
    },
  );
  typia.assert(pageLimited);
  TestValidator.equals(
    "pagination limit respected",
    pageLimited.pagination.limit,
    1,
  );
  if (pageLimited.data.length > 0) {
    typia.assert(pageLimited.data[0]);
  }

  // Negative test: switch to adminOther and attempt to query adminMain's sessions, expect permission error
  await api.functional.auth.admin.join(connection, { body: adminOtherReq });
  await TestValidator.error(
    "non-owner admin cannot query other user's sessions",
    async () => {
      await api.functional.todoList.admin.users.sessions.index(connection, {
        userId: adminMainId,
        body: req1,
      });
    },
  );
}
