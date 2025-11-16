import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validates that an authenticated seller can create an attribute for their own
 * product.
 *
 * Steps:
 *
 * 1. Seller registers via /auth/seller/join
 * 2. Seller creates a product via /shoppingMall/products
 * 3. Seller adds an attribute (e.g. color, size) to the product using
 *    /shoppingMall/seller/products/{productId}/attributes
 * 4. Validates that attribute creation is successful; respects name uniqueness per
 *    product, position integer constraints, and proper linkage to the owning
 *    product.
 */
export async function test_api_product_attribute_creation_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Register seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerBusinessName = RandomGenerator.name();
  const sellerRegistrationNumber = RandomGenerator.alphaNumeric(12);
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(12) as string &
        tags.Format<"password">,
      business_name: sellerBusinessName,
      registration_number: sellerRegistrationNumber,
      business_phone: RandomGenerator.mobile(),
      href: "https://seller-test.example.com/onboarding",
      referrer: "https://seller-test.example.com/landing",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(seller);

  // Step 2: Seller creates a product
  const productTitle = RandomGenerator.paragraph({ sentences: 2 });
  const product = await api.functional.shoppingMall.products.create(
    connection,
    {
      body: {
        title: productTitle,
        description: RandomGenerator.content({ paragraphs: 2 }),
        default_price: typia.random<number>(),
        business_status: "draft",
      },
    },
  );
  typia.assert(product);
  TestValidator.equals(
    "Product is owned by the seller",
    product.seller.business_name,
    seller.business_name,
  );

  // Step 3: Seller creates first attribute (e.g. color)
  const attributeName = `color_${RandomGenerator.alphabets(5)}`;
  const attributePosition = 0;
  const attribute =
    await api.functional.shoppingMall.seller.products.attributes.create(
      connection,
      {
        productId: product.id,
        body: {
          attribute_name: attributeName as string & tags.MinLength<1>,
          position: attributePosition as number &
            tags.Type<"int32"> &
            tags.Minimum<0>,
        },
      },
    );
  typia.assert(attribute);
  TestValidator.equals(
    "Attribute product id matches",
    attribute.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "Attribute name set correctly",
    attribute.attribute_name,
    attributeName,
  );
  TestValidator.equals(
    "Attribute position set correctly",
    attribute.position,
    attributePosition,
  );

  // Step 4: Uniqueness rule validation - attempt to create duplicate attribute name for the same product
  await TestValidator.error(
    "Cannot create duplicate attribute name for same product",
    async () => {
      await api.functional.shoppingMall.seller.products.attributes.create(
        connection,
        {
          productId: product.id,
          body: {
            attribute_name: attributeName as string & tags.MinLength<1>,
            position: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
          },
        },
      );
    },
  );

  // Step 5: Different attribute with allowed unique name
  const attributeName2 = `size_${RandomGenerator.alphabets(4)}`;
  const attribute2 =
    await api.functional.shoppingMall.seller.products.attributes.create(
      connection,
      {
        productId: product.id,
        body: {
          attribute_name: attributeName2 as string & tags.MinLength<1>,
          position: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
        },
      },
    );
  typia.assert(attribute2);
  TestValidator.equals(
    "Second attribute product id matches",
    attribute2.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "Second attribute name set correctly",
    attribute2.attribute_name,
    attributeName2,
  );
  TestValidator.equals(
    "Second attribute position set correctly",
    attribute2.position,
    1,
  );
}
