import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_registration_empty_business_address(
  connection: api.IConnection,
) {
  // Act: Attempt seller registration with empty business address
  await TestValidator.error(
    "seller registration should reject empty business address",
    async () => {
      await api.functional.shoppingMall.actors.sellers.create(connection, {
        body: "", // Empty string for business address as per requirement
      });
    },
  );
}
