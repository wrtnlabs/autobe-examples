import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallLoyaltyPointTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLoyaltyPointTransaction";

export async function test_api_loyalty_point_transaction_retrieval(
  connection: api.IConnection,
) {
  const loyaltyPointId: string = typia.random<string & tags.Format<"uuid">>();

  const transaction: IShoppingMallLoyaltyPointTransaction =
    await api.functional.shoppingMall.customer.promotions.loyalty_points.at(
      connection,
      {
        loyaltyPointId: loyaltyPointId,
      },
    );
  typia.assert(transaction);
}
