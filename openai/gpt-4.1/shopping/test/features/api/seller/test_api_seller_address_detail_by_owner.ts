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
 * Test seller can view detail of their own address, with all fields matching.
 *
 * 1. Register seller account (ensure onboarding OK).
 * 2. Create a product (to ensure sellerId exists and context is complete).
 * 3. Add a seller address as the seller.
 * 4. Get the address details using the seller's credentials and ids.
 * 5. Assert all fields returned match the creation data.
 * 6. Try access from a different seller and confirm error thrown (ownership
 *    check).
 */
export async function test_api_seller_address_detail_by_owner(
  connection: api.IConnection,
) {
  // Seller registration
  const sellerReg = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    },
  });
  typia.assert(sellerReg);
  const sellerId = sellerReg.id;

  // Create a product (platform expects a product for a valid seller)
  const product = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        main_image_uri:
          "https://picsum.photos/seed/" +
          RandomGenerator.alphaNumeric(10) +
          "/600/600",
        status: "draft",
        business_status: "in_review",
      },
    },
  );
  typia.assert(product);

  // Create new seller address
  const createAddressBody = {
    address_line1: RandomGenerator.paragraph({ sentences: 2 }),
    address_line2: RandomGenerator.paragraph({ sentences: 1 }),
    city: RandomGenerator.name(1),
    state: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(6),
    country: "South Korea",
    is_primary: true,
    is_return_address: false,
    phone: RandomGenerator.mobile(),
    recipient_name: RandomGenerator.name(2),
  };
  const address = await api.functional.shopping.seller.sellers.addresses.create(
    connection,
    {
      sellerId,
      body: createAddressBody,
    },
  );
  typia.assert(address);
  const addressId = address.id;

  // Retrieve address detail by owner
  const detail = await api.functional.shopping.seller.sellers.addresses.at(
    connection,
    {
      sellerId,
      addressId,
    },
  );
  typia.assert(detail);
  TestValidator.equals(
    "seller address fields match created",
    detail.address_line1,
    createAddressBody.address_line1,
  );
  TestValidator.equals(
    "seller address_line2 matches",
    detail.address_line2,
    createAddressBody.address_line2,
  );
  TestValidator.equals("city matches", detail.city, createAddressBody.city);
  TestValidator.equals("state matches", detail.state, createAddressBody.state);
  TestValidator.equals(
    "postal code matches",
    detail.postal_code,
    createAddressBody.postal_code,
  );
  TestValidator.equals(
    "country matches",
    detail.country,
    createAddressBody.country,
  );
  TestValidator.equals(
    "is_primary matches",
    detail.is_primary,
    createAddressBody.is_primary,
  );
  TestValidator.equals(
    "is_return_address matches",
    detail.is_return_address,
    createAddressBody.is_return_address,
  );
  TestValidator.equals("phone matches", detail.phone, createAddressBody.phone);
  TestValidator.equals(
    "recipient_name matches",
    detail.recipient_name,
    createAddressBody.recipient_name,
  );
  TestValidator.equals(
    "seller id matches",
    detail.shopping_seller_id,
    sellerId,
  );
  // Try different seller - register and attempt unauthorized access
  const attacker = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    },
  });
  typia.assert(attacker);
  await TestValidator.error(
    "unauthorized read forbidden for other sellers",
    async () => {
      await api.functional.shopping.seller.sellers.addresses.at(connection, {
        sellerId: attacker.id,
        addressId,
      });
    },
  );
}
