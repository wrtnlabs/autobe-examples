import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductAttributeValue";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import type { IShoppingMallProductAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttributeValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_sku_attribute_value_list_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a seller and create a product as that seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(10);
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: RandomGenerator.name(),
      registration_number: RandomGenerator.alphaNumeric(10),
      business_phone: RandomGenerator.mobile(),
      href: "https://seller.example.com",
      referrer: "https://google.com",
      ip: undefined,
    },
  });
  typia.assert(seller);

  // Seller creates a product
  const product = await api.functional.shoppingMall.products.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        default_price: 10000,
        business_status: "draft",
      },
    },
  );
  typia.assert(product);

  // Seller creates a SKU for the product
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        price: 12000,
        stock: 100,
        status: "active",
      },
    },
  );
  typia.assert(sku);

  // Seller creates an attribute for the product
  const attribute =
    await api.functional.shoppingMall.seller.products.attributes.create(
      connection,
      {
        productId: product.id,
        body: {
          attribute_name: "Color",
          position: 0,
        },
      },
    );
  typia.assert(attribute);

  // Seller adds an attribute value to the SKU
  const valueDisplayName = "Red";
  const attributeValue =
    await api.functional.shoppingMall.seller.skus.attributeValues.create(
      connection,
      {
        skuId: sku.id,
        body: {
          shopping_mall_product_attribute_id: attribute.id,
          value_display_name: valueDisplayName,
        },
      },
    );
  typia.assert(attributeValue);

  // Register and login as an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });

  // Admin requests all attribute values for the SKU
  const fullList =
    await api.functional.shoppingMall.admin.skus.attributeValues.index(
      connection,
      {
        skuId: sku.id,
        body: {},
      },
    );
  typia.assert(fullList);

  // Validate output contains the attribute value just created
  TestValidator.predicate(
    "attribute value appears in full list",
    ArrayUtil.has(
      fullList.data,
      (v) => v.value_display_name === valueDisplayName && v.sku.id === sku.id,
    ),
  );

  // Admin filters by attribute_id: should find the created value
  const filteredByAttribute =
    await api.functional.shoppingMall.admin.skus.attributeValues.index(
      connection,
      {
        skuId: sku.id,
        body: { attribute_id: attribute.id },
      },
    );
  typia.assert(filteredByAttribute);
  TestValidator.predicate(
    "attribute value appears when filtered by attribute_id",
    ArrayUtil.has(
      filteredByAttribute.data,
      (v) =>
        v.value_display_name === valueDisplayName &&
        v.attribute.id === attribute.id,
    ),
  );

  // Admin filters by value_display_name: should also find the value
  const filteredByValue =
    await api.functional.shoppingMall.admin.skus.attributeValues.index(
      connection,
      {
        skuId: sku.id,
        body: { value_display_name: valueDisplayName },
      },
    );
  typia.assert(filteredByValue);
  TestValidator.predicate(
    "attribute value appears when filtered by value_display_name",
    ArrayUtil.has(
      filteredByValue.data,
      (v) => v.value_display_name === valueDisplayName,
    ),
  );
}
