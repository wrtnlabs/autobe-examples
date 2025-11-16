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
 * End-to-end test for retrieval of a SKU attribute value mapping by a seller
 * after setup of product, attribute, SKU, and value mapping flow.
 *
 * This test covers the following scenario:
 *
 * 1. Seller registers a new account to gain authorization (calling POST
 *    /auth/seller/join).
 * 2. Seller creates a new product (POST /shoppingMall/products).
 * 3. Seller adds a product attribute to the product (POST
 *    /shoppingMall/seller/products/{productId}/attributes).
 * 4. Seller creates a SKU for the product (POST
 *    /shoppingMall/seller/products/{productId}/skus).
 * 5. Seller assigns an attribute value to the SKU (POST
 *    /shoppingMall/seller/skus/{skuId}/attributeValues).
 * 6. Seller retrieves the attribute value mapping (GET
 *    /shoppingMall/skus/{skuId}/attributeValues/{attributeValueId}) and
 *    verifies correct linkage and audit fields.
 *
 * The test verifies:
 *
 * - End-to-end linkage and data integrity of product, attribute, SKU, and value
 *   mapping
 * - Seller authentication and permission flows
 * - Type safety of all DTOs and business logic property compatibility
 * - That fetch returns the same values supplied during creation
 */
export async function test_api_sku_attribute_value_retrieval_by_seller(
  connection: api.IConnection,
) {
  // 1. Register seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    business_name: RandomGenerator.name(3),
    registration_number: RandomGenerator.alphaNumeric(10),
    business_phone: RandomGenerator.mobile(),
    href: "https://www.example.com/onboarding",
    referrer: "https://www.example.com/",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSeller.ICreate;
  const sellerAuthorized = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert(sellerAuthorized);

  // 2. Create product
  const prodTitle = RandomGenerator.name(2);
  const prodBody = {
    title: prodTitle,
    description: RandomGenerator.content(),
    default_price: 19900,
    business_status: "draft",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.products.create(
    connection,
    { body: prodBody },
  );
  typia.assert(product);
  TestValidator.equals("product title", product.title, prodBody.title);

  // 3. Add product attribute
  const attrName = RandomGenerator.name(1);
  const attrBody = {
    attribute_name: attrName,
    position: 0,
  } satisfies IShoppingMallProductAttribute.ICreate;
  const attribute =
    await api.functional.shoppingMall.seller.products.attributes.create(
      connection,
      { productId: product.id, body: attrBody },
    );
  typia.assert(attribute);
  TestValidator.equals(
    "attribute product id matches",
    attribute.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "attribute name matches",
    attribute.attribute_name,
    attrBody.attribute_name,
  );

  // 4. Register SKU
  const skuBody = {
    sku_code: RandomGenerator.alphaNumeric(6),
    price: 19900,
    stock: 15,
    status: "active",
  } satisfies IShoppingMallProductSku.ICreate;
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    { productId: product.id, body: skuBody },
  );
  typia.assert(sku);
  TestValidator.equals("SKU product id", sku.product.id, product.id);

  // 5. Assign attribute value to SKU
  const valueDisplayName = RandomGenerator.name(1);
  const attrValueBody = {
    shopping_mall_product_attribute_id: attribute.id,
    value_display_name: valueDisplayName,
  } satisfies IShoppingMallProductAttributeValue.ICreate;
  const attrValue =
    await api.functional.shoppingMall.seller.skus.attributeValues.create(
      connection,
      { skuId: sku.id, body: attrValueBody },
    );
  typia.assert(attrValue);
  TestValidator.equals(
    "mapping attribute id",
    attrValue.shopping_mall_product_attribute_id,
    attribute.id,
  );
  TestValidator.equals(
    "mapping value_display_name",
    attrValue.value_display_name,
    valueDisplayName,
  );

  // 6. Retrieve mapping by GET endpoint
  const mapping = await api.functional.shoppingMall.skus.attributeValues.at(
    connection,
    { skuId: sku.id, attributeValueId: attrValue.id },
  );
  typia.assert(mapping);
  TestValidator.equals(
    "fetched attribute mapping id",
    mapping.id,
    attrValue.id,
  );
  TestValidator.equals(
    "fetched SKU id",
    mapping.shopping_mall_product_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "fetched attribute id",
    mapping.shopping_mall_product_attribute_id,
    attribute.id,
  );
  TestValidator.equals(
    "fetched value_display_name",
    mapping.value_display_name,
    valueDisplayName,
  );
  TestValidator.equals(
    "created_at present",
    typeof mapping.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at present",
    typeof mapping.updated_at,
    "string",
  );
}
