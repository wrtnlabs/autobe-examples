import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that requesting a non-existent seller ID returns a 404 Not Found error.
 *
 * Validates that the API properly handles invalid UUIDs or seller IDs that do not
 * exist in the system by returning an appropriate 404 error response.
 * This verifies the business rule that the endpoint queries the ecommerce_mall_sellers
 * table and returns 404 if the seller does not exist.
 */
export async function test_api_seller_public_profile_view_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that does not exist in the system
  const nonExistentSellerId = typia.random<string & tags.Format<"uuid">>();
  // Test that requesting a non-existent seller returns 404
  await TestValidator.httpError(
    "non-existent seller should return 404",
    404,
    async () =>
      await api.functional.ecommerceMall.sellers._public.at(connection, {
        sellerId: nonExistentSellerId,
      }),
  );
}
