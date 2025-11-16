import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductAttributeValue";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import type { IShoppingMallProductAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttributeValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that a seller can list attribute values for a SKU with filtering and
 * pagination.
 *
 * End-to-end workflow:
 *
 * 1. Seller joins the platform by registering.
 * 2. Seller creates a catalog product.
 * 3. Seller creates a SKU for that product.
 * 4. Seller assigns a new attribute value to the SKU. (Attribute ID must match a
 *    real attribute if available, otherwise use a random UUID.)
 * 5. Use the PATCH /shoppingMall/seller/skus/{skuId}/attributeValues endpoint with
 *    request body containing possible filters and pagination (page, limit).
 * 6. Assert that the response contains the attribute value(s) just created for
 *    that SKU.
 * 7. If additional attribute values are created for the SKU, verify that filtering
 *    and pagination parameters work as expected.
 *
 * Key business assertions:
 *
 * - Seller authentication is valid.
 * - Product and SKU creation complete successfully.
 * - The attribute value assignment is visible to the list endpoint.
 * - Filtering by attribute id and value_display_name yield correct subsets.
 * - Pagination returns expected counts and respects page/limit.
 */
export async function test_api_sku_attribute_value_list_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller registers
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerRegNum = RandomGenerator.alphaNumeric(10);
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(12),
      business_name: RandomGenerator.name(),
      registration_number: sellerRegNum,
      business_phone: RandomGenerator.mobile(),
      href: "https://seller.dashboard/registration",
      referrer: "https://shoppingmall/home",
      ip: undefined,
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // 2. Seller creates product
  const product = await api.functional.shoppingMall.products.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        default_price: 9900,
        business_status: "draft",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 3. Seller creates a SKU
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        price: 10900,
        stock: 42,
        status: "active",
      } satisfies IShoppingMallProductSku.ICreate,
    },
  );
  typia.assert(sku);

  // 4. Seller assigns an attribute value to SKU
  const attributeId = typia.random<string & tags.Format<"uuid">>();
  const attrValueName = RandomGenerator.paragraph({ sentences: 1 });
  const attrValue =
    await api.functional.shoppingMall.seller.skus.attributeValues.create(
      connection,
      {
        skuId: sku.id,
        body: {
          shopping_mall_product_attribute_id: attributeId,
          value_display_name: attrValueName,
        } satisfies IShoppingMallProductAttributeValue.ICreate,
      },
    );
  typia.assert(attrValue);

  // 5. Retrieve attribute values for SKU (list endpoint, no filters first)
  const page1 =
    await api.functional.shoppingMall.seller.skus.attributeValues.index(
      connection,
      {
        skuId: sku.id,
        body: {},
      },
    );
  typia.assert(page1);
  TestValidator.predicate(
    "attribute value assigned appears in list",
    page1.data.some(
      (v) => v.id === attrValue.id && v.value_display_name === attrValueName,
    ),
  );

  // 6. Retrieve with filtering by attribute_id
  const pageFiltered =
    await api.functional.shoppingMall.seller.skus.attributeValues.index(
      connection,
      {
        skuId: sku.id,
        body: { attribute_id: attributeId },
      },
    );
  typia.assert(pageFiltered);
  TestValidator.predicate(
    "filtered by attribute_id yields created value",
    pageFiltered.data.some((v) => v.id === attrValue.id),
  );

  // 7. Retrieve with filtering by value_display_name
  const partialName = attrValueName.substring(
    0,
    Math.floor(attrValueName.length / 2),
  );
  const pageFilteredName =
    await api.functional.shoppingMall.seller.skus.attributeValues.index(
      connection,
      {
        skuId: sku.id,
        body: { value_display_name: partialName },
      },
    );
  typia.assert(pageFilteredName);
  TestValidator.predicate(
    "filtered by partial value_display_name yields created value",
    pageFilteredName.data.some((v) => v.id === attrValue.id),
  );

  // 8. Create a second attribute value for pagination testing
  const secondAttrId = typia.random<string & tags.Format<"uuid">>();
  const secondAttrName = RandomGenerator.paragraph({ sentences: 1 });
  const secondAttrValue =
    await api.functional.shoppingMall.seller.skus.attributeValues.create(
      connection,
      {
        skuId: sku.id,
        body: {
          shopping_mall_product_attribute_id: secondAttrId,
          value_display_name: secondAttrName,
        } satisfies IShoppingMallProductAttributeValue.ICreate,
      },
    );
  typia.assert(secondAttrValue);

  // 9. Pagination: retrieve both values with limit=1, page=1, page=2
  const pageOne =
    await api.functional.shoppingMall.seller.skus.attributeValues.index(
      connection,
      {
        skuId: sku.id,
        body: { limit: 1, page: 1 },
      },
    );
  typia.assert(pageOne);
  TestValidator.equals(
    "pagination returns only one value on page 1",
    pageOne.data.length,
    1,
  );

  const pageTwo =
    await api.functional.shoppingMall.seller.skus.attributeValues.index(
      connection,
      {
        skuId: sku.id,
        body: { limit: 1, page: 2 },
      },
    );
  typia.assert(pageTwo);
  TestValidator.equals(
    "pagination returns only one value on page 2",
    pageTwo.data.length,
    1,
  );

  // 10. Pagination returned values are different
  TestValidator.notEquals(
    "page 1 and page 2 values are not the same",
    pageOne.data[0].id,
    pageTwo.data[0].id,
  );
}
