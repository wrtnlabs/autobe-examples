import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberUser";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";

export async function test_api_member_user_erase_without_authentication(
  connection: api.IConnection,
) {
  // 1. Ensure an admin user exists and obtain an authorized admin connection
  //    by joining via /auth/adminUser/join.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todoapp.local/join",
    referrer: "https://admin.todoapp.local/login",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // At this point, the SDK has injected the Authorization header into
  // `connection` so subsequent calls use an authenticated admin context.

  // 2. Use PATCH /todoApp/adminUser/memberUsers to fetch at least one
  //    existing member user. We do not control fixture seeding here, so we
  //    assume pre-seeded data exists; if the page comes back empty, the test
  //    will simply short-circuit as there is nothing meaningful to verify.
  const initialPage: IPageITodoAppMemberUser.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
        search: undefined,
        status: undefined,
        created_from: undefined,
        created_to: undefined,
        order_by: undefined,
        order_direction: undefined,
      } satisfies ITodoAppMemberUser.IRequest,
    });
  typia.assert(initialPage);

  // Short-circuit: if there is no member user at all, we cannot perform the
  // erase scenario meaningfully. In that case, just ensure the page shape and
  // exit.
  if (initialPage.data.length === 0) return;

  const target: ITodoAppMemberUser.ISummary = initialPage.data[0];
  typia.assert<ITodoAppMemberUser.ISummary>(target);

  // 3. Create an unauthenticated connection by cloning the provided
  //    connection and providing an empty headers object, without touching the
  //    original connection.headers further.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Call erase with the unauthenticated connection and assert that
  //    authorization fails. We do not care about the exact status code here
  //    (401 vs 403), only that some HttpError is thrown, so use
  //    TestValidator.error rather than TestValidator.httpError.
  await TestValidator.error("unauthenticated erase must fail", async () => {
    await api.functional.todoApp.adminUser.memberUsers.erase(
      unauthenticatedConnection,
      {
        memberUserId: target.id,
      },
    );
  });

  // 5. Re-query member users with the original authenticated admin
  //    connection to verify that the target member user still exists.
  const afterPage: IPageITodoAppMemberUser.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
        search: undefined,
        status: undefined,
        created_from: undefined,
        created_to: undefined,
        order_by: undefined,
        order_direction: undefined,
      } satisfies ITodoAppMemberUser.IRequest,
    });
  typia.assert(afterPage);

  const stillExists = afterPage.data.some((m) => m.id === target.id);
  TestValidator.predicate(
    "member user must still exist after unauthorized erase attempt",
    stillExists,
  );
}
