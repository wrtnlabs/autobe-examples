import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test scenario 3: Admin Seller List Empty Result Handling
 * - Authenticate as administrator by joining the platform.
 * - Use filters that yield no sellers such as a future creation date range with no sellers.
 * - Verify the response is an empty seller list.
 * - Confirm pagination metadata shows zero records and zero pages.
 * - Ensure response structure is valid and no errors are returned.
 * - This tests the system's ability to handle edge case of empty data gracefully.
 */
export async function test_api_administrator_sellers_list_empty_result_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      password: "12345678",
      email: `admin_${Date.now()}@example.com`,
    },
  });
  adminConnection.headers = {
    Authorization: administrator.token.access,
  };
  // 2. Use filters for future creation date range where no sellers should exist
  const futureDateGte = new Date(Date.now() + 86400000).toISOString(); // +1 day
  const futureDateLte = new Date(Date.now() + 2 * 86400000).toISOString(); // +2 days
  const sellerList =
    await api.functional.shoppingMall.administrator.sellers.index(
      adminConnection,
      {
        body: {
          created_at_gte: futureDateGte,
          created_at_lte: futureDateLte,
          page: 1,
          limit: 20,
        },
      },
    );
  // 3. Assertions
  typia.assert(sellerList);
  TestValidator.equals("empty data length", sellerList.data.length, 0);
  TestValidator.equals("pagination records", sellerList.pagination.records, 0);
  TestValidator.equals("pagination pages", sellerList.pagination.pages, 0);
  TestValidator.equals("pagination current", sellerList.pagination.current, 1);
  TestValidator.equals("pagination limit", sellerList.pagination.limit, 20);
}
