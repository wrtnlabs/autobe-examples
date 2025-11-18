import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";

export async function test_api_admin_guest_user_detail_unauthorized_access_blocked_by_missing_token(
  connection: api.IConnection,
) {
  // 1) Register an admin user to satisfy dependency and ensure admin capability exists
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/register",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const admin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(admin);

  // 2) Build an unauthenticated connection (no Authorization header)
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3) Prepare a valid-looking UUID for guestUserId (existence should not be leaked)
  const guestUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4) Attempt to access the admin-only guest user detail endpoint without token
  //    Expectation: call fails due to missing authentication (some HttpError)
  await TestValidator.error(
    "missing token blocks guest user detail access",
    async () => {
      await api.functional.todoApp.adminUser.guestUsers.at(unauthenticated, {
        guestUserId,
      });
    },
  );
}
