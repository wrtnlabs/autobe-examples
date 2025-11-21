import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallLoyaltyPointTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallLoyaltyPointTransaction";
import type { IShoppingMallLoyaltyPointTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLoyaltyPointTransaction";

export async function test_api_loyalty_points_unauthorized_access(
  connection: api.IConnection,
) {
  // Test unauthorized access to loyalty points endpoint
  // Verify that unauthenticated requests to PATCH /shoppingMall/promotions/loyalty-points return 401 Unauthorized
  // Create a connection without authentication headers (emptied headers object)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Attempt to access loyalty points endpoint without authentication
  // This should fail with 401 Unauthorized error due to missing authentication
  await TestValidator.error(
    "unauthenticated user should receive 401 Unauthorized",
    async () => {
      await api.functional.shoppingMall.promotions.loyalty_points.index(
        unauthConnection,
        {
          body: {
            page: 1,
            limit: 10,
          } satisfies IShoppingMallLoyaltyPointTransaction.IRequest,
        },
      );
    },
  );
}
