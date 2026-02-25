import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_system_version_erase_success_and_error_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const newAdmin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass1234",
    },
  });
  typia.assert(newAdmin);
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = newAdmin.token.access;
  // Generate a random UUID for attempts
  const existingId = typia.random<string & tags.Format<"uuid">>();
  // 2. Successful deletion scenario: attempt to delete system version record by UUID
  await api.functional.shoppingMall.administrator.systemVersions.erase(
    adminConnection,
    { id: existingId },
  );
  // 3. Not found scenario: try erase with a different non-existent UUID and expect 404
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "not found error on deleting non-existing system version",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.systemVersions.erase(
        adminConnection,
        { id: nonExistentId },
      );
    },
  );
  // 4. Unauthorized scenario: attempt deletion without admin token
  await TestValidator.httpError(
    "unauthorized error on deleting without admin authentication",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.systemVersions.erase(
        { host: connection.host },
        { id: nonExistentId },
      );
    },
  );
}
