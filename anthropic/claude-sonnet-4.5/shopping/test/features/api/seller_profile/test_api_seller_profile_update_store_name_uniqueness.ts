import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test store_name uniqueness constraint enforcement during seller profile
 * updates.
 *
 * This test validates that the marketplace properly enforces the store_name
 * uniqueness constraint to prevent duplicate store names across different
 * sellers, which could confuse buyers and compromise brand identity
 * protection.
 *
 * Test Flow:
 *
 * 1. Create three independent seller accounts with unique store names
 * 2. Authenticate as the first seller
 * 3. Successfully update the first seller's store_name to a new unique value
 *    (positive case)
 * 4. Attempt to update to the second seller's existing store_name (negative case -
 *    should fail)
 * 5. Verify proper error handling for duplicate store_name violations
 */
export async function test_api_seller_profile_update_store_name_uniqueness(
  connection: api.IConnection,
) {
  // Create first seller account with unique store name
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const seller1StoreName = RandomGenerator.name(2);
  const seller1Data = {
    email: seller1Email,
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.name(3),
    business_description: RandomGenerator.paragraph({ sentences: 5 }),
    store_name: seller1StoreName,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller1: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: seller1Data,
    });
  typia.assert(seller1);

  // Create second seller account with different unique store name
  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller2StoreName = RandomGenerator.name(2);
  const seller2Data = {
    email: seller2Email,
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.name(3),
    business_description: RandomGenerator.paragraph({ sentences: 5 }),
    store_name: seller2StoreName,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: seller2Data,
    });
  typia.assert(seller2);

  // Create third seller account for additional test data
  const seller3Email = typia.random<string & tags.Format<"email">>();
  const seller3StoreName = RandomGenerator.name(2);
  const seller3Data = {
    email: seller3Email,
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.name(3),
    business_description: RandomGenerator.paragraph({ sentences: 5 }),
    store_name: seller3StoreName,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller3: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: seller3Data,
    });
  typia.assert(seller3);

  // Authenticate as first seller (already authenticated from join, but explicit context)
  // The join operation already set the authentication token in connection.headers

  // Positive case: Successfully update store_name to a completely new unique value
  const newUniqueStoreName = RandomGenerator.name(2);
  const updatedSeller1: IShoppingMallSeller =
    await api.functional.shoppingMall.seller.sellers.update(connection, {
      sellerId: seller1.id,
      body: {
        store_name: newUniqueStoreName,
      } satisfies IShoppingMallSeller.IUpdate,
    });
  typia.assert(updatedSeller1);
  TestValidator.equals(
    "store name updated successfully",
    updatedSeller1.store_name,
    newUniqueStoreName,
  );

  // Negative case: Attempt to update store_name to match seller2's existing store_name
  // This should fail due to uniqueness constraint violation
  await TestValidator.error(
    "duplicate store_name should be rejected",
    async () => {
      await api.functional.shoppingMall.seller.sellers.update(connection, {
        sellerId: seller1.id,
        body: {
          store_name: seller2StoreName,
        } satisfies IShoppingMallSeller.IUpdate,
      });
    },
  );
}
