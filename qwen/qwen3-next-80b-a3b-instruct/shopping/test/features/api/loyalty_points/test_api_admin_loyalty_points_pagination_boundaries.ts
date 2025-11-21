import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallLoyaltyPointTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallLoyaltyPointTransaction";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallLoyaltyPointTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLoyaltyPointTransaction";

export async function test_api_admin_loyalty_points_pagination_boundaries(
  connection: api.IConnection,
) {
  const email: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: email,
        password: "SecurePassword123!",
        first_name: "Admin",
        last_name: "User",
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  const minLimit = 1;
  const maxLimit = 100;

  // Test minimum limit boundary (1)
  const minRequest: IShoppingMallLoyaltyPointTransaction.IRequest = {
    page: 1,
    limit: minLimit,
  };
  const minResponse: IPageIShoppingMallLoyaltyPointTransaction =
    await api.functional.shoppingMall.admin.promotions.loyalty_points.index(
      connection,
      {
        body: minRequest,
      },
    );
  typia.assert(minResponse);
  TestValidator.equals(
    "minimum limit response has correct limit",
    minResponse.pagination.limit,
    minLimit,
  );

  // Test maximum limit boundary (100)
  const maxRequest: IShoppingMallLoyaltyPointTransaction.IRequest = {
    page: 1,
    limit: maxLimit,
  };
  const maxResponse: IPageIShoppingMallLoyaltyPointTransaction =
    await api.functional.shoppingMall.admin.promotions.loyalty_points.index(
      connection,
      {
        body: maxRequest,
      },
    );
  typia.assert(maxResponse);
  TestValidator.equals(
    "maximum limit response has correct limit",
    maxResponse.pagination.limit,
    maxLimit,
  );

  // Test failure: limit below minimum (0)
  await TestValidator.error("limit below minimum should fail", async () => {
    await api.functional.shoppingMall.admin.promotions.loyalty_points.index(
      connection,
      {
        body: {
          page: 1,
          limit: 0,
        } satisfies IShoppingMallLoyaltyPointTransaction.IRequest,
      },
    );
  });

  // Test failure: limit above maximum (101)
  await TestValidator.error("limit above maximum should fail", async () => {
    await api.functional.shoppingMall.admin.promotions.loyalty_points.index(
      connection,
      {
        body: {
          page: 1,
          limit: 101,
        } satisfies IShoppingMallLoyaltyPointTransaction.IRequest,
      },
    );
  });
}
