import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that requesting a non-existent seller profile returns 404 Not Found.
 *
 * This validates proper error handling when a customer requests a seller
 * profile using an ID that doesn't exist in the database. This scenario can
 * occur when a customer clicks on an outdated link or bookmark for a seller
 * that never existed or was permanently removed.
 */
export async function test_api_seller_profile_nonexistent_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that does not correspond to any seller in the database
  const nonExistentSellerId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to fetch a seller profile that doesn't exist
  // Should throw HttpError with 404 status code
  await TestValidator.httpError(
    "non-existent seller profile should return 404",
    404,
    async () =>
      await api.functional.shoppingMall.sellers.at(connection, {
        sellerId: nonExistentSellerId,
      }),
  );
}
