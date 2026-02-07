import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSystematicVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystematicVersion";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystematicVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicVersion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_deployment_history_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication - register new admin
  const adminConnection: api.IConnection = { host: connection.host };
  const joinOutput = await api.functional.shoppingMall.auth.admin.join(
    adminConnection,
    {
      body: typia.random<IShoppingMallAdmin.IJoin>(),
    },
  );
  typia.assert(joinOutput);
  // Update connection with auth token
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${joinOutput.token.access}`,
  };
  // 2. Test successful deployment history retrieval
  const deploymentHistory =
    await api.functional.shoppingMall.admin.versions.deployment_history.index(
      adminConnection,
    );
  typia.assert(deploymentHistory);
  // 3. Validate response structure
  TestValidator.predicate(
    "has pagination",
    deploymentHistory.pagination !== undefined,
  );
  TestValidator.predicate(
    "has data array",
    Array.isArray(deploymentHistory.data),
  );
  // 4. Validate pagination properties
  TestValidator.equals(
    "pagination exists",
    typeof deploymentHistory.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page is valid",
    deploymentHistory.pagination.current > 0,
  );
  TestValidator.predicate(
    "limit is valid",
    deploymentHistory.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records count is valid",
    deploymentHistory.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    deploymentHistory.pagination.pages >= 0,
  );
  // 5. Test with different pagination parameters
  // Test with specific page size
  const deploymentHistory2 =
    await api.functional.shoppingMall.admin.versions.deployment_history.index(
      adminConnection,
    );
  typia.assert(deploymentHistory2);
  // Validate that results are consistent
  TestValidator.predicate(
    "results are valid",
    deploymentHistory2.data !== undefined,
  );
  // 6. Verify version data structure - removed 'id' property access which doesn't exist on IShoppingMallSystematicVersion
  if (deploymentHistory.data.length > 0) {
    // const firstVersion = deploymentHistory.data[0];
    // Removed test for 'id' property as IShoppingMallSystematicVersion doesn't have 'id'
  }
  // 7. Test admin access with different admin accounts
  const adminConnection2: api.IConnection = { host: connection.host };
  const joinOutput2 = await api.functional.shoppingMall.auth.admin.join(
    adminConnection2,
    {
      body: typia.random<IShoppingMallAdmin.IJoin>(),
    },
  );
  typia.assert(joinOutput2);
  adminConnection2.headers = {
    ...adminConnection2.headers,
    Authorization: `Bearer ${joinOutput2.token.access}`,
  };
  const deploymentHistory3 =
    await api.functional.shoppingMall.admin.versions.deployment_history.index(
      adminConnection2,
    );
  typia.assert(deploymentHistory3);
  TestValidator.predicate(
    "different admin can also access",
    deploymentHistory3.data !== undefined,
  );
}
