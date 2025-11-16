import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller self-access to their address detail record.
 *
 * 1. Register seller account and extract sellerId with authentication context.
 * 2. Prepare a simulated address for the seller (as creation API is not available
 *    here).
 * 3. Fetch address detail using GET and validate response structure and ownership.
 * 4. Attempt access to a different, non-owned address and verify error (ownership
 *    enforcement).
 */
export async function test_api_seller_address_detail_self_access(
  connection: api.IConnection,
) {
  // 1. Register new seller, get auth and sellerId
  const sellerCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    business_name: RandomGenerator.name(),
    registration_number: RandomGenerator.alphaNumeric(10),
    business_phone: RandomGenerator.mobile(),
    href: "https://example.com/onboarding",
    referrer: "https://example.com/landing",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerCreate,
  });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;

  // 2. Prepare an address as if it exists in DB and belongs to seller
  const address: IShoppingMallAddress = {
    id: typia.random<string & tags.Format<"uuid">>(),
    full_name: RandomGenerator.name(),
    street: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(1),
    province: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(6),
    country: "South Korea",
    phone: RandomGenerator.mobile(),
    is_default: true,
    created_at: new Date().toISOString(),
    shopping_mall_customer_id: null,
    shopping_mall_seller_id: sellerId,
  };

  // 3. Simulate an address fetch for the seller's own address (simulate mode)
  //    In a live DB, the address would be created by POST, but here assume it exists.
  if (connection.simulate) {
    // Simulate DB seeding: Add to mock DB if needed; assume address is available
  }
  const addressDetail =
    await api.functional.shoppingMall.seller.sellers.addresses.at(connection, {
      sellerId,
      addressId: address.id,
    });
  typia.assert(addressDetail);
  TestValidator.equals(
    "fetched address matches requested ID",
    addressDetail.id,
    address.id,
  );
  TestValidator.equals(
    "fetched address belongs to seller",
    addressDetail.shopping_mall_seller_id,
    sellerId,
  );
  TestValidator.equals(
    "default address flag is correct",
    addressDetail.is_default,
    address.is_default,
  );
  TestValidator.equals(
    "address has no customer link",
    addressDetail.shopping_mall_customer_id,
    null,
  );

  // 4. Attempt to read a non-owned address and verify error (ownership enforcement)
  const otherSellerId = typia.random<string & tags.Format<"uuid">>();
  const otherAddressId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "fetching address not belonging to seller should fail",
    async () => {
      await api.functional.shoppingMall.seller.sellers.addresses.at(
        connection,
        {
          sellerId,
          addressId: otherAddressId,
        },
      );
    },
  );
  await TestValidator.error(
    "fetching seller's address using wrong sellerId should fail",
    async () => {
      await api.functional.shoppingMall.seller.sellers.addresses.at(
        connection,
        {
          sellerId: otherSellerId,
          addressId: address.id,
        },
      );
    },
  );
}
