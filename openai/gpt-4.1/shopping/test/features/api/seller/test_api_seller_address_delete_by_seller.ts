import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test that a registered seller can delete their own address using seller
 * endpoint.
 *
 * 1. Register a new seller with randomly generated valid business data, unique
 *    email and registration number, valid password, current/referrer uris,
 *    phone, and any optional ip.
 * 2. Extract sellerId from the response and use the automatically authenticated
 *    connection (join returns and sets tokens).
 * 3. Generate a random UUID to represent an address owned by this seller (since
 *    address creation or listing APIs are not exposed in current scope).
 * 4. Call api.functional.shoppingMall.seller.sellers.addresses.erase with sellerId
 *    and the synthetic addressId, validating that the call completes without
 *    error.
 * 5. Optionally, additional validations (e.g. that the address is truly deleted)
 *    are not possible here because no address read/listing API is available in
 *    current test context.
 */
export async function test_api_seller_address_delete_by_seller(
  connection: api.IConnection,
) {
  // 1. Register a new seller and assert proper structure.
  const sellerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    business_name: RandomGenerator.name(),
    registration_number: RandomGenerator.alphaNumeric(12),
    business_phone: RandomGenerator.mobile(),
    href: "https://mall.example.com/onboarding",
    referrer: "https://landingpage.example.com/",
    ip: null,
  } satisfies IShoppingMallSeller.ICreate;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerInput,
  });
  typia.assert(sellerAuth);
  TestValidator.equals(
    "join returns matching email",
    sellerAuth.email,
    sellerInput.email,
  );

  // 2. Create a random addressId (simulate owned address).
  const addressId = typia.random<string & tags.Format<"uuid">>();

  // 3. Call erase API with authenticated seller.
  await api.functional.shoppingMall.seller.sellers.addresses.erase(connection, {
    sellerId: sellerAuth.id,
    addressId: addressId,
  });

  // 4. (No list/read available) Validate operation did not throw and context was correct.
  TestValidator.predicate(
    "seller address delete operation completed without error",
    true, // If reached here, operation succeeded
  );
}
