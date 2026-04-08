import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that attempting to view a profile for a non-existent seller returns 404 error.
 *
 * Validates the system's proper handling of requests for seller profiles that do not exist. This test ensures that when a customer or guest attempts to retrieve a seller profile using a seller ID that does not correspond to any existing seller account, the API responds with an appropriate 404 error rather than returning invalid data or crashing.
 *
 * The test generates a random UUID that is guaranteed not to exist in the system and attempts to use it as a sellerId parameter when calling the seller profile endpoint. The API should validate that the seller exists before attempting to return profile data and return a descriptive error message indicating the seller was not found.
 *
 * 1. Generate a random UUID that does not correspond to any existing seller.
 * 2. Attempt to retrieve a seller profile using this non-existent UUID.
 * 3. Validate that the response returns 404 status code with error message 'Seller not found'.
 */
export async function test_api_seller_profile_view_nonexistent_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a random UUID that does not correspond to any existing seller
  const nonexistentSellerId = typia.random<string & tags.Format<"uuid">>();
  // 2. Attempt to retrieve a seller profile using this non-existent UUID
  // 3. Validate 404 error response
  await TestValidator.httpError("Seller not found", 404, async () => {
    await api.functional.ecommerceMall.sellers.profile.at(connection, {
      sellerId: nonexistentSellerId,
    });
  });
}
