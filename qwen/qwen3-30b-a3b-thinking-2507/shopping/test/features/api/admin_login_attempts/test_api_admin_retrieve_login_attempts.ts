import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallLoginAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallLoginAttempt";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallLoginAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLoginAttempt";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_retrieve_login_attempts(
  connection: api.IConnection,
): Promise<void> {
  // Create and authenticate admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Retrieve failed login attempts
  const result =
    await api.functional.shoppingMall.admin.login_attempts.index(
      adminConnection,
    );
  typia.assert(result);
  // Validate pagination structure
  TestValidator.equals("paginations has correct structure", result.pagination, {
    current: 1,
    limit: 10,
    records: 0,
    pages: 0,
  } satisfies IPage.IPagination);
}
