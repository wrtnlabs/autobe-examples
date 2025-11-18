import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

export async function test_api_admin_user_delete_forbidden_by_insufficient_privileges(
  connection: api.IConnection,
) {
  // 1. Create first admin (adminA) and authenticate as that user.
  const adminAJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminA: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminAJoinInput,
    });
  typia.assert(adminA);

  // 2. Create second admin (adminB), which also switches the
  //    Authorization header to adminB for subsequent requests.
  const adminBJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminB: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminBJoinInput,
    });
  typia.assert(adminB);

  // 3. Attempt to delete adminA as adminB. This cross-account
  //    operation should be forbidden by authorization rules, so we
  //    expect the call to fail with some error.
  await TestValidator.error("cross-admin deletion must fail", async () => {
    await api.functional.todoApp.adminUser.adminUsers.erase(connection, {
      adminUserId: adminA.id,
    });
  });
}
