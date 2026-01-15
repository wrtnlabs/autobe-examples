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
export async function test_api_admin_failed_logins_retrieval(
  connection: api.IConnection,
) {
  // Create connection for admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Create new admin account with realistic test data
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string>(),
      name: typia.random<string & tags.MinLength<2> & tags.MaxLength<100>>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Verify admin credentials match test data
  TestValidator.equals(
    "admin email matches random generated",
    admin.email,
    adminConnection.host + "%%%user%2F" + admin.email,
  );
  // Fetch failed login analytics using admin credentials
  const failedLogins =
    await api.functional.shoppingMall.admin.auth.analytics.failed_logins.index(
      adminConnection,
    );
  typia.assert(failedLogins);
  // Verify pagination has minimal noise properly initialized
  TestValidator.equals(
    "pagination current page should start at 1",
    failedLogins.pagination.current,
    1,
  );
  // Verify data is initialized as empty array (no failed logins yet)
  TestValidator.equals(
    "should have 0 failed login items on initial load",
    failedLogins.data.length,
    0,
  );
}
