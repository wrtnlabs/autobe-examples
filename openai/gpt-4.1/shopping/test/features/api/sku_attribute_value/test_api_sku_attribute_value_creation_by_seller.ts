import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import type { IShoppingMallProductAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttributeValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate creation of a product SKU attribute value mapping by an
 * authenticated seller.
 *
 * 1. Register and authenticate a new seller.
 * 2. Create a new product for the seller.
 * 3. Add an attribute to the product (e.g., color).
 * 4. Register a SKU for the product.
 * 5. Create an attribute value mapping linking the created attribute (e.g., color:
 *    Red) to the SKU using the
 *    /shoppingMall/seller/skus/{skuId}/attributeValues endpoint.
 * 6. Test that creating a duplicate mapping for the same (sku, attribute) pair
 *    fails (business rule enforcement).
 * 7. Test mapping a different attribute or SKU is permitted (per business rules).
 * 8. Assert audit fields (created_at, updated_at), linkage, and value display
 *    correctness for attribute value mapping.
 */
export async function test_api_sku_attribute_value_creation_by_seller(
  connection: api.IConnection,
) {
  // 1. Register and authenticate new seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerRegNum = RandomGenerator.alphaNumeric(12);
  const sellerBusinessName = RandomGenerator.name();
  const sellerPhone = RandomGenerator.mobile();
  const href = "https://shoppingmall.example.com/onboard";
  const referrer = "https://shoppingmall.example.com/register";
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(12),
      business_name: sellerBusinessName,
      registration_number: sellerRegNum,
      business_phone: sellerPhone,
      href,
      referrer,
      ip: undefined,
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(sellerAuth);
  TestValidator.predicate(
    "seller is authenticated",
    typeof sellerAuth.id === "string",
  );

  // 2. Create a product
  const product = await api.functional.shoppingMall.products.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 6,
        }),
        default_price: Math.round(Math.random() * 10000 + 1000),
        business_status: RandomGenerator.pick([
          "draft",
          "published",
          "archived",
          "blocked",
        ] as const),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  TestValidator.equals(
    "product seller",
    product.seller.business_name,
    sellerBusinessName,
  );

  // 3. Add attribute (e.g., color)
  const attributeName = RandomGenerator.pick([
    "Color",
    "Size",
    "Material",
  ] as const);
  const attribute =
    await api.functional.shoppingMall.seller.products.attributes.create(
      connection,
      {
        productId: product.id,
        body: {
          attribute_name: attributeName,
          position: 0,
        } satisfies IShoppingMallProductAttribute.ICreate,
      },
    );
  typia.assert(attribute);
  TestValidator.equals(
    "attribute parent",
    attribute.shopping_mall_product_id,
    product.id,
  );

  // 4. Register SKU
  const skuCode = RandomGenerator.alphaNumeric(8);
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        sku_code: skuCode,
        price: product.default_price,
        stock: 50,
        status: RandomGenerator.pick([
          "active",
          "draft",
          "out_of_stock",
        ] as const),
      } satisfies IShoppingMallProductSku.ICreate,
    },
  );
  typia.assert(sku);
  TestValidator.equals("SKU product link", sku.product.id, product.id);

  // 5. Assign attribute value (e.g., 'Red')
  const attrValueLabel = RandomGenerator.pick([
    "Red",
    "Blue",
    "L",
    "XL",
    "Cotton",
  ] as const);
  const attributeValue =
    await api.functional.shoppingMall.seller.skus.attributeValues.create(
      connection,
      {
        skuId: sku.id,
        body: {
          shopping_mall_product_attribute_id: attribute.id,
          value_display_name: attrValueLabel,
        } satisfies IShoppingMallProductAttributeValue.ICreate,
      },
    );
  typia.assert(attributeValue);
  TestValidator.equals(
    "attribute value mapping: SKU id",
    attributeValue.shopping_mall_product_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "attribute value mapping: attribute id",
    attributeValue.shopping_mall_product_attribute_id,
    attribute.id,
  );
  TestValidator.equals(
    "attribute value mapping: value display name",
    attributeValue.value_display_name,
    attrValueLabel,
  );
  TestValidator.predicate(
    "attribute value mapping has created_at",
    typeof attributeValue.created_at === "string",
  );
  TestValidator.predicate(
    "attribute value mapping has updated_at",
    typeof attributeValue.updated_at === "string",
  );

  // 6. Attempt to create duplicate attribute value mapping for same (sku, attribute) pair - expect failure
  await TestValidator.error(
    "duplicate attribute value mapping is rejected",
    async () => {
      await api.functional.shoppingMall.seller.skus.attributeValues.create(
        connection,
        {
          skuId: sku.id,
          body: {
            shopping_mall_product_attribute_id: attribute.id,
            value_display_name: RandomGenerator.pick([
              "Red",
              "Blue",
              "L",
              "XL",
              "Cotton",
            ] as const),
          } satisfies IShoppingMallProductAttributeValue.ICreate,
        },
      );
    },
  );

  // 7. Create and map a different attribute or different SKU (should work)
  // 7a. Create another attribute for the same product
  const anotherAttributeName = attributeName === "Color" ? "Size" : "Color";
  const anotherAttribute =
    await api.functional.shoppingMall.seller.products.attributes.create(
      connection,
      {
        productId: product.id,
        body: {
          attribute_name: anotherAttributeName,
          position: 1,
        } satisfies IShoppingMallProductAttribute.ICreate,
      },
    );
  typia.assert(anotherAttribute);
  TestValidator.notEquals(
    "second attribute different from first",
    anotherAttribute.id,
    attribute.id,
  );

  // 7b. Add mapping to same SKU, different attribute (should succeed)
  const anotherValueLabel = RandomGenerator.pick([
    "Small",
    "Medium",
    "Black",
    "White",
  ] as const);
  const anotherAttributeValue =
    await api.functional.shoppingMall.seller.skus.attributeValues.create(
      connection,
      {
        skuId: sku.id,
        body: {
          shopping_mall_product_attribute_id: anotherAttribute.id,
          value_display_name: anotherValueLabel,
        } satisfies IShoppingMallProductAttributeValue.ICreate,
      },
    );
  typia.assert(anotherAttributeValue);
  TestValidator.equals(
    "second attribute value mapping: SKU id",
    anotherAttributeValue.shopping_mall_product_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "second attribute value mapping: attribute id",
    anotherAttributeValue.shopping_mall_product_attribute_id,
    anotherAttribute.id,
  );
  TestValidator.equals(
    "second attribute value mapping: value display name",
    anotherAttributeValue.value_display_name,
    anotherValueLabel,
  );

  // 7c. Register another SKU, and assign the first attribute to that SKU (should succeed)
  const anotherSkuCode = RandomGenerator.alphaNumeric(8);
  const anotherSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: {
        sku_code: anotherSkuCode,
        price: product.default_price + 500,
        stock: 25,
        status: RandomGenerator.pick([
          "active",
          "draft",
          "out_of_stock",
        ] as const),
      } satisfies IShoppingMallProductSku.ICreate,
    });
  typia.assert(anotherSku);
  TestValidator.notEquals(
    "second SKU different from first",
    anotherSku.id,
    sku.id,
  );

  // Add attribute value mapping (should succeed)
  const anotherSkuValueLabel = RandomGenerator.pick([
    "Red",
    "Blue",
    "L",
    "XL",
    "Cotton",
  ] as const);
  const mappingForAnotherSku =
    await api.functional.shoppingMall.seller.skus.attributeValues.create(
      connection,
      {
        skuId: anotherSku.id,
        body: {
          shopping_mall_product_attribute_id: attribute.id,
          value_display_name: anotherSkuValueLabel,
        } satisfies IShoppingMallProductAttributeValue.ICreate,
      },
    );
  typia.assert(mappingForAnotherSku);
  TestValidator.equals(
    "another SKU mapping: SKU id",
    mappingForAnotherSku.shopping_mall_product_sku_id,
    anotherSku.id,
  );
  TestValidator.equals(
    "another SKU mapping: attribute id",
    mappingForAnotherSku.shopping_mall_product_attribute_id,
    attribute.id,
  );
  TestValidator.equals(
    "another SKU mapping: value display name",
    mappingForAnotherSku.value_display_name,
    anotherSkuValueLabel,
  );
}
