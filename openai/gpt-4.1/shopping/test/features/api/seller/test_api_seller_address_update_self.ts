import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Authenticated seller can update one of their own saved addresses with valid
 * details.
 *
 * - Seller joins (registers), is automatically authenticated.
 * - Seller updates an address with all new, valid values (simulates pre-created
 *   address since create endpoint is not provided for address explicitly).
 * - Response is checked that all fields were updated as per request.
 * - Also, an attempt to update another seller's address is rejected (should
 *   error).
 */
export async function test_api_seller_address_update_self(
  connection: api.IConnection,
) {
  // Step 1: Register (join) first seller
  const seller1Auth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        business_name: RandomGenerator.paragraph({ sentences: 2 }),
        registration_number: RandomGenerator.alphaNumeric(10),
        business_phone: RandomGenerator.mobile(),
        href: "https://seller1.example.com/home",
        referrer: "https://google.com/",
        ip: null,
      },
    });
  typia.assert(seller1Auth);
  const seller1Id = seller1Auth.id;

  // Step 2: Prepare addressId (simulating a pre-created address for this seller)
  const addressId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Prepare address update data (all fields valid/randomized)
  const updateBody = {
    full_name: RandomGenerator.name(),
    street: RandomGenerator.paragraph({ sentences: 1 }),
    city: RandomGenerator.name(1),
    province: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(7),
    country: "South Korea",
    phone: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallAddress.IUpdate;

  // Step 4: Update address (for owned address)
  const updatedAddress: IShoppingMallAddress =
    await api.functional.shoppingMall.seller.sellers.addresses.update(
      connection,
      {
        sellerId: seller1Id,
        addressId,
        body: updateBody,
      },
    );
  typia.assert(updatedAddress);
  TestValidator.equals(
    "address full_name updated",
    updatedAddress.full_name,
    updateBody.full_name,
  );
  TestValidator.equals(
    "address is_default updated",
    updatedAddress.is_default,
    updateBody.is_default,
  );
  TestValidator.equals(
    "address sellerId correct",
    updatedAddress.shopping_mall_seller_id,
    seller1Id,
  );
  TestValidator.equals("address id matches", updatedAddress.id, addressId);

  // Step 5: Negative case - Register second seller and try to update other seller's address
  const seller2Auth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        business_name: RandomGenerator.paragraph({ sentences: 2 }),
        registration_number: RandomGenerator.alphaNumeric(10),
        business_phone: RandomGenerator.mobile(),
        href: "https://seller2.example.com/home",
        referrer: "https://bing.com/",
        ip: null,
      },
    });
  typia.assert(seller2Auth);
  const seller2Id = seller2Auth.id;

  // Seller 2 attempts to update seller 1's address (should fail)
  await TestValidator.error(
    "updating an address not owned by seller should fail",
    async () => {
      await api.functional.shoppingMall.seller.sellers.addresses.update(
        connection,
        {
          sellerId: seller2Id,
          addressId,
          body: updateBody,
        },
      );
    },
  );
}
