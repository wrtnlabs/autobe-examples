import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import type { IShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeValue";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import type { IShoppingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProduct";
import type { IShoppingProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductAttribute";
import type { IShoppingProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductImage";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSellerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSellerAddress";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingSkuImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuImage";
import type { IShoppingSkuVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuVariant";
import type { IShoppingTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingTag";

/**
 * Validates seller address soft delete functionality with full authorization
 * and business edge case coverage.
 *
 * This scenario covers:
 *
 * 1. SellerA successfully registering and creating an address
 * 2. SellerA soft-deleting (erase) their address, expecting deleted_at to be set
 * 3. Attempting to delete the address again should not physically remove it
 *    (should stay soft-deleted)
 * 4. SellerB failing to erase SellerA's address (should get authorization error)
 * 5. If seller’s only primary/return address, deletion should fail with a business
 *    error
 */
export async function test_api_seller_address_soft_delete_with_authorization(
  connection: api.IConnection,
) {
  // 1. Register SellerA and authenticate
  const emailA = typia.random<string & tags.Format<"email">>();
  const sellerA: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: emailA,
        password: "passwordA123!",
        display_name: RandomGenerator.name(),
        contact_phone: RandomGenerator.mobile(),
        status: "pending",
      } satisfies IShoppingSeller.IJoin,
    });
  typia.assert(sellerA);

  // 2. SellerA creates address
  const addressInfoA = {
    address_line1: RandomGenerator.paragraph({ sentences: 1 }),
    address_line2: RandomGenerator.paragraph({ sentences: 1 }),
    city: RandomGenerator.name(1),
    state: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(8),
    country: "South Korea",
    is_primary: true,
    is_return_address: true,
    phone: RandomGenerator.mobile(),
    recipient_name: RandomGenerator.name(1),
  } satisfies IShoppingSellerAddress.ICreate;
  const addressA: IShoppingSellerAddress =
    await api.functional.shopping.seller.sellers.addresses.create(connection, {
      sellerId: sellerA.id,
      body: addressInfoA,
    });
  typia.assert(addressA);
  TestValidator.equals(
    "created address - is not deleted",
    addressA.deleted_at,
    null,
  );

  // 3. SellerA soft deletes address
  const erased: IShoppingSellerAddress =
    await api.functional.shopping.seller.sellers.addresses.erase(connection, {
      sellerId: sellerA.id,
      addressId: addressA.id,
    });
  typia.assert(erased);
  TestValidator.predicate(
    "deleted_at is set after soft delete",
    erased.deleted_at !== null && erased.deleted_at !== undefined,
  );

  // 4. Attempt to soft delete again: should still be present (deleted_at remains set)
  const erasedAgain: IShoppingSellerAddress =
    await api.functional.shopping.seller.sellers.addresses.erase(connection, {
      sellerId: sellerA.id,
      addressId: addressA.id,
    });
  typia.assert(erasedAgain);
  TestValidator.equals(
    "repeated erase does not physically remove address",
    erasedAgain.deleted_at !== null && erasedAgain.deleted_at !== undefined,
    true,
  );

  // 5. Register SellerB
  const emailB = typia.random<string & tags.Format<"email">>();
  const sellerB: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: emailB,
        password: "passwordB123!",
        display_name: RandomGenerator.name(),
        contact_phone: RandomGenerator.mobile(),
        status: "pending",
      } satisfies IShoppingSeller.IJoin,
    });
  typia.assert(sellerB);

  // 6. SellerB tries to erase SellerA's address (should be forbidden)
  await TestValidator.error(
    "authorization error for deleting another seller's address",
    async () => {
      await api.functional.shopping.seller.sellers.addresses.erase(connection, {
        sellerId: sellerB.id,
        addressId: addressA.id,
      });
    },
  );

  // 7. Attempt to delete only primary/return address for SellerB (should fail)
  const addressInfoB = {
    address_line1: RandomGenerator.paragraph({ sentences: 1 }),
    address_line2: RandomGenerator.paragraph({ sentences: 1 }),
    city: RandomGenerator.name(1),
    state: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(8),
    country: "South Korea",
    is_primary: true,
    is_return_address: true,
    phone: RandomGenerator.mobile(),
    recipient_name: RandomGenerator.name(1),
  } satisfies IShoppingSellerAddress.ICreate;
  const addressB: IShoppingSellerAddress =
    await api.functional.shopping.seller.sellers.addresses.create(connection, {
      sellerId: sellerB.id,
      body: addressInfoB,
    });
  typia.assert(addressB);
  await TestValidator.error(
    "cannot delete only primary/return address (business rule)",
    async () => {
      await api.functional.shopping.seller.sellers.addresses.erase(connection, {
        sellerId: sellerB.id,
        addressId: addressB.id,
      });
    },
  );
}
