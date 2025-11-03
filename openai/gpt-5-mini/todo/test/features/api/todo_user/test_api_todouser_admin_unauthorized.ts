import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodouser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodouser";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_todouser_admin_unauthorized(
  connection: api.IConnection,
) {
  // 1) Create a todoUser account so the system contains at least one user.
  //    Use a valid ICreate body (valid email, password length >= 8, href and referrer URIs).
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    displayName: null,
    ip: null,
    href: "http://localhost/signup",
    referrer: "http://localhost/",
  } satisfies ITodoAppTodoUser.ICreate;

  const authorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: joinBody,
    });
  // Validate authorized response shape and that the join succeeded
  typia.assert(authorized);

  // 2) Prepare an unauthenticated connection by cloning the original connection
  //    and providing empty headers. Do NOT mutate the original connection.headers.
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3) Call the admin listing endpoint without admin credentials and expect an
  //    authorization error (401 or 403). Use a minimal pagination request.
  await TestValidator.httpError(
    "admin user listing without credentials should be rejected",
    [401, 403],
    async () => {
      await api.functional.todoApp.admin.todoUsers.index(unauthConn, {
        body: {
          page: 1,
          pageSize: 10,
        } satisfies ITodoAppTodoUser.IRequest,
      });
    },
  );

  // 4) End of test. No further assertions: the httpError validator ensures
  //    the server rejected the request with an authorization-related status.
}
