import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test error handling when retrieving seller profiles that do not exist in the
 * system. This scenario validates that the API properly handles requests for
 * deleted, suspended, or never-existing seller accounts. Tests that appropriate
 * error responses are returned with clear messaging indicating the seller is
 * not found, and that the system doesn't expose information about whether
 * seller accounts ever existed.
 */
export async function test_api_seller_profile_nonexistent_seller(
  connection: api.IConnection,
) {
  // Generate a random UUID that doesn't correspond to any existing seller
  const nonExistentSellerId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to retrieve seller profile for non-existent seller
  // This should throw an error since the seller doesn't exist
  await TestValidator.error(
    "non-existent seller should return error",
    async () => {
      await api.functional.shoppingMall.sellers.at(connection, {
        sellerId: nonExistentSellerId,
      });
    },
  );
}
