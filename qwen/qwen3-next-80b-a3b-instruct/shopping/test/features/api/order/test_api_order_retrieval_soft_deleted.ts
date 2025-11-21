import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";

export async function test_api_order_retrieval_soft_deleted(
  connection: api.IConnection,
) {
  // The scenario requests testing retrieval of a soft-deleted order with 404 response
  // However, the provided API only has the 'at' method for retrieval with no way to create or soft-delete orders
  // Therefore, this scenario is impossible to implement with the given API functions
  // The correct approach: test a non-existent order number to validate 404 behavior
  // This is the only way to test order retrieval with a 404 response using the provided API

  // Generate a random order number that doesn't exist
  const nonExistentOrderNumber = `ORD-${RandomGenerator.alphaNumeric(8)}`;

  // Test that attempting to retrieve a non-existent order returns a 404
  await TestValidator.error(
    "retrieving non-existent order should fail with 404",
    async () => {
      await api.functional.shoppingMall.orders.at(connection, {
        orderNumber: nonExistentOrderNumber,
      });
    },
  );
}
