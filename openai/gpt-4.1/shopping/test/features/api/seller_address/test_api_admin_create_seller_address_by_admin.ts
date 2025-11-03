import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
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
 * Validate that an admin can create a new address for a seller by first
 * authenticating as an admin and ensuring the seller exists via product
 * creation (which triggers seller account creation). The test should verify
 * both success and error scenarios: (1) creating an address for a valid seller
 * and (2) attempting address creation for a non-existent seller should fail.
 * Tests must verify complete field coverage—address_line1, city, state,
 * postal_code, country, recipient_name, phone, is_primary,
 * is_return_address—correct format and association with sellerId, with the
 * admin context properly set. The response must return the exact address
 * created. Business rules for uniqueness and format are to be respected by
 * providing randomized content. Negative test: non-existent sellerId must
 * result in a business logic error, not a type error.
 */
export async function test_api_admin_create_seller_address_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin signup and context establish
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminRes = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(2),
      role: "super", // assume 'super' role is valid
      status: "active",
    } satisfies IShoppingAdmin.IJoin,
  });
  typia.assert(adminRes);

  // 2. Create a product as seller, this will create a seller implicitly
  const productRes = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 8,
          wordMax: 12,
        }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 4,
          sentenceMax: 8,
          wordMin: 4,
          wordMax: 10,
        }),
        main_image_uri: `https://example.com/product/${RandomGenerator.alphaNumeric(8)}.jpg`,
        status: "active",
        business_status: "in_review",
        shipping_weight_grams: 500,
        shipping_length_cm: 30,
        shipping_width_cm: 15,
        shipping_height_cm: 10,
        shipping_options: "standard",
      } satisfies IShoppingProduct.ICreate,
    },
  );
  typia.assert(productRes);
  const sellerId = productRes.seller.id;

  // 3. Create admin-created seller address: all required fields, check response
  const addressBody = {
    address_line1: RandomGenerator.paragraph({ sentences: 2 }),
    address_line2: RandomGenerator.paragraph({ sentences: 1 }),
    city: RandomGenerator.name(1),
    state: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(6),
    country: "South Korea",
    is_primary: true,
    is_return_address: true,
    phone: RandomGenerator.mobile("010"),
    recipient_name: RandomGenerator.name(2),
  } satisfies IShoppingSellerAddress.ICreate;
  const newAddr = await api.functional.shopping.admin.sellers.addresses.create(
    connection,
    {
      sellerId: sellerId,
      body: addressBody,
    },
  );
  typia.assert(newAddr);

  // Validate returned fields - all business attributes
  TestValidator.equals(
    "created address_line1",
    newAddr.address_line1,
    addressBody.address_line1,
  );
  TestValidator.equals("created city", newAddr.city, addressBody.city);
  TestValidator.equals("created state", newAddr.state, addressBody.state);
  TestValidator.equals(
    "created postal_code",
    newAddr.postal_code,
    addressBody.postal_code,
  );
  TestValidator.equals("created country", newAddr.country, addressBody.country);
  TestValidator.equals(
    "created recipient_name",
    newAddr.recipient_name,
    addressBody.recipient_name,
  );
  TestValidator.equals("created phone", newAddr.phone, addressBody.phone);
  TestValidator.equals(
    "created is_primary",
    newAddr.is_primary,
    addressBody.is_primary,
  );
  TestValidator.equals(
    "created is_return_address",
    newAddr.is_return_address,
    addressBody.is_return_address,
  );
  TestValidator.equals(
    "address associated with seller",
    newAddr.shopping_seller_id,
    sellerId,
  );

  // 4. Negative test: Try to create address with non-existent sellerId
  const fakeSellerId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should fail when sellerId does not exist",
    async () => {
      await api.functional.shopping.admin.sellers.addresses.create(connection, {
        sellerId: fakeSellerId,
        body: addressBody,
      });
    },
  );
}
