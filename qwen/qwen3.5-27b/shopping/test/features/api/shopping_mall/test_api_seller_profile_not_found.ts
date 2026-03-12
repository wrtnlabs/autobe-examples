import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_seller_profile_not_found(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test seller profile endpoint returns 404 for non-existent seller.
   *
   * This test verifies that the GET /shoppingMall/sellers/{sellerId} endpoint
   * properly handles requests for sellers that don't exist in the system by
   * returning an HTTP 404 Not Found error.
   */
  // Generate a random UUID that doesn't exist in the database
  const nonExistentSellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Verify that requesting a non-existent seller returns HTTP 404
  await TestValidator.httpError(
    "should return 404 for non-existent seller",
    404,
    async () =>
      await api.functional.shoppingMall.sellers.at(connection, {
        sellerId: nonExistentSellerId,
      }),
  );
}
