import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";

export async function test_api_order_retrieval_malformed_format(
  connection: api.IConnection,
) {
  await TestValidator.error(
    "non-existent order with invalid format",
    async () => {
      await api.functional.shoppingMall.orders.at(connection, {
        orderNumber: "INVALID-FORMAT-123",
      });
    },
  );
}
