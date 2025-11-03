import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSellerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSellerAddress";

/**
 * Test creation of multiple types of seller addresses by a new seller.
 *
 * 1. Register a new seller account (join, capture sellerId)
 * 2. Create a business (primary) address
 * 3. Create a return address
 * 4. Create a warehouse address (neither primary nor return)
 * 5. Attempt to create a second primary address (must fail business logic)
 * 6. Attempt to create a second return address (must fail)
 * 7. Attempt to create address with duplicate fields (should fail on full
 *    deduplication)
 * 8. Attempt to create address under another sellerId (should fail authorization)
 *
 * Confirm all successful responses with typia.assert and correct ownership,
 * verify error cases with TestValidator.error
 */
export async function test_api_seller_address_creation_new_seller(
  connection: api.IConnection,
) {
  // 1. Register a new seller
  const sellerJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoin });
  typia.assert(seller);

  // 2. Create primary business address
  const primaryAddressBody = {
    address_line1: RandomGenerator.paragraph({ sentences: 1 }),
    address_line2: RandomGenerator.paragraph({ sentences: 1 }),
    city: RandomGenerator.name(1),
    state: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(6),
    country: "South Korea",
    is_primary: true,
    is_return_address: false,
    phone: RandomGenerator.mobile(),
    recipient_name: RandomGenerator.name(1),
  } satisfies IShoppingSellerAddress.ICreate;
  const primaryAddress =
    await api.functional.shopping.seller.sellers.addresses.create(connection, {
      sellerId: seller.id,
      body: primaryAddressBody,
    });
  typia.assert(primaryAddress);
  TestValidator.equals(
    "primary address: ownership",
    primaryAddress.shopping_seller_id,
    seller.id,
  );
  TestValidator.equals(
    "primary address: is_primary",
    primaryAddress.is_primary,
    true,
  );

  // 3. Create return address
  const returnAddressBody = {
    address_line1: RandomGenerator.paragraph({ sentences: 1 }),
    city: RandomGenerator.name(1),
    state: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(6),
    country: "South Korea",
    is_primary: false,
    is_return_address: true,
    phone: RandomGenerator.mobile(),
    recipient_name: RandomGenerator.name(1),
  } satisfies IShoppingSellerAddress.ICreate;
  const returnAddress =
    await api.functional.shopping.seller.sellers.addresses.create(connection, {
      sellerId: seller.id,
      body: returnAddressBody,
    });
  typia.assert(returnAddress);
  TestValidator.equals(
    "return address: ownership",
    returnAddress.shopping_seller_id,
    seller.id,
  );
  TestValidator.equals(
    "return address: is_return_address",
    returnAddress.is_return_address,
    true,
  );

  // 4. Create warehouse address (neither primary nor return)
  const warehouseAddressBody = {
    address_line1: RandomGenerator.paragraph({ sentences: 1 }),
    address_line2: RandomGenerator.paragraph({ sentences: 1 }),
    city: RandomGenerator.name(1),
    state: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(6),
    country: "South Korea",
    is_primary: false,
    is_return_address: false,
    phone: RandomGenerator.mobile(),
    recipient_name: RandomGenerator.name(1),
  } satisfies IShoppingSellerAddress.ICreate;
  const warehouseAddress =
    await api.functional.shopping.seller.sellers.addresses.create(connection, {
      sellerId: seller.id,
      body: warehouseAddressBody,
    });
  typia.assert(warehouseAddress);
  TestValidator.equals(
    "warehouse address: ownership",
    warehouseAddress.shopping_seller_id,
    seller.id,
  );
  TestValidator.equals(
    "warehouse address: is_primary",
    warehouseAddress.is_primary,
    false,
  );
  TestValidator.equals(
    "warehouse address: is_return_address",
    warehouseAddress.is_return_address,
    false,
  );

  // 5. Attempt to create a 2nd primary address – must fail
  const secondPrimaryBody = {
    ...warehouseAddressBody,
    is_primary: true,
  } satisfies IShoppingSellerAddress.ICreate;
  await TestValidator.error(
    "cannot create second primary address",
    async () => {
      await api.functional.shopping.seller.sellers.addresses.create(
        connection,
        { sellerId: seller.id, body: secondPrimaryBody },
      );
    },
  );

  // 6. Attempt to create a 2nd return address – must fail
  const secondReturnBody = {
    ...warehouseAddressBody,
    is_primary: false,
    is_return_address: true,
  } satisfies IShoppingSellerAddress.ICreate;
  await TestValidator.error("cannot create second return address", async () => {
    await api.functional.shopping.seller.sellers.addresses.create(connection, {
      sellerId: seller.id,
      body: secondReturnBody,
    });
  });

  // 7. Attempt to create duplicate address (all fields same as primary)
  await TestValidator.error("duplicate address is not allowed", async () => {
    await api.functional.shopping.seller.sellers.addresses.create(connection, {
      sellerId: seller.id,
      body: primaryAddressBody,
    });
  });

  // 8. Attempt address creation under different sellerId
  const foreignSellerJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const foreignSeller = await api.functional.auth.seller.join(connection, {
    body: foreignSellerJoin,
  });
  typia.assert(foreignSeller);
  await TestValidator.error(
    "cannot create address under another seller's account",
    async () => {
      await api.functional.shopping.seller.sellers.addresses.create(
        connection,
        { sellerId: foreignSeller.id, body: primaryAddressBody },
      );
    },
  );
}
