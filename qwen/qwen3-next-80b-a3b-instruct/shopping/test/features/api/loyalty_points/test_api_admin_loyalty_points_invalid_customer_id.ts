import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallLoyaltyPointTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallLoyaltyPointTransaction";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallLoyaltyPointTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLoyaltyPointTransaction";

export async function test_api_admin_loyalty_points_invalid_customer_id(
  connection: api.IConnection,
) {
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: typia.random<IShoppingMallAdmin.ICreate>(),
    });
  typia.assert(admin);

  const invalidCustomerId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  const response: IPageIShoppingMallLoyaltyPointTransaction =
    await api.functional.shoppingMall.admin.promotions.loyalty_points.index(
      connection,
      {
        body: { customer_id: invalidCustomerId, page: 1, limit: 10 },
      },
    );
  typia.assert(response);

  TestValidator.equals("page pagination", response.pagination.current, 1);
  TestValidator.equals("page limit", response.pagination.limit, 10);
  TestValidator.equals("total records", response.pagination.records, 0);
  TestValidator.equals("total pages", response.pagination.pages, 0);
  TestValidator.equals("empty data array", response.data.length, 0);
}
