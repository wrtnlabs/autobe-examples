import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfile";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test default admin seller profile browsing with pagination and sorting validation.
 *
 * Verifies that an authenticated administrator can browse seller profiles using the default pagination parameters. The test authenticates as an admin via the join endpoint, then requests the seller profiles list without any search filters or explicit pagination parameters, relying on the server's default values.
 *
 * The response is validated for correct pagination metadata and proper sorting of results. Even when no sellers exist, the response should return an empty data array with correct pagination values.
 *
 * 1. Administrator registers and authenticates via authorize_admin_join.
 * 2. Administrator requests seller profiles with an empty request body, relying on default pagination (page=1, limit=20).
 * 3. Validates pagination metadata: current page is 1, limit is 20, and pages calculation is consistent with total records.
 * 4. Validates sorting order: shop_name ascending with null shop_name values placed at the end.
 */
export async function test_api_admin_profiles_browse_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Browse seller profiles with default pagination
  const result = await api.functional.shoppingMall.admin.profiles.index(
    adminConnection,
    {
      body: {} satisfies IShoppingMallSellerProfile.IRequest,
    },
  );
  typia.assert(result);
  // 3. Validate pagination metadata
  TestValidator.equals("current page default", result.pagination.current, 1);
  TestValidator.equals("limit default", result.pagination.limit, 20);
  TestValidator.predicate(
    "pages calculation consistent with total records",
    result.pagination.pages ===
      Math.ceil(result.pagination.records / result.pagination.limit),
  );
  // 4. Validate sorting: shop_name ascending, null values last
  TestValidator.predicate("shop_name ascending with nulls sorted last", () => {
    let prevName: string | null = null;
    let nullReached = false;
    for (const profile of result.data) {
      if (profile.shop_name === null) {
        nullReached = true;
      } else {
        if (nullReached) return false;
        if (prevName !== null && profile.shop_name < prevName) return false;
      }
      prevName = profile.shop_name;
    }
    return true;
  });
}
