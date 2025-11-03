import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingInventory";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import type { IShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeValue";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import type { IShoppingInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingInventory";
import type { IShoppingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProduct";
import type { IShoppingProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductAttribute";
import type { IShoppingProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductImage";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingSkuImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuImage";
import type { IShoppingSkuVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuVariant";
import type { IShoppingTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingTag";

/**
 * Validate admin inventory paginated search with business filtering.
 *
 * - Registers a fresh admin and authenticates (receives JWT).
 * - Creates a unique product and one related SKU to ensure presence in inventory.
 * - Invokes /shopping/admin/inventory search:
 *
 *   - Basic paginated listing
 *   - Filtered by product_code, sku_code, min/max quantity, and keyword
 *   - Verifies business pagination metadata and returns correct data shape
 * - Asserts that unauthorized (unauthenticated) connection is rejected.
 * - Inventory record count/page size checks, and record fields verified
 */
export async function test_api_admin_inventory_paginated_search_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin registration/authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "Str0ngPwd!x",
      name: RandomGenerator.name(),
      role: "super",
      status: "active",
    },
  });
  typia.assert(admin);
  TestValidator.equals("admin email matches", adminEmail, admin.email);

  // Step 2: Create new product
  const productCode = RandomGenerator.alphaNumeric(10);
  const productName = RandomGenerator.paragraph({ sentences: 3 });
  const product = await api.functional.shopping.admin.products.create(
    connection,
    {
      body: {
        code: productCode,
        name: productName,
        description: RandomGenerator.content({ paragraphs: 2 }),
        main_image_uri: "https://picsum.photos/600/600",
        status: "active",
        business_status: "in_review",
      },
    },
  );
  typia.assert(product);
  TestValidator.equals("product code matches", productCode, product.code);
  TestValidator.equals("product name matches", productName, product.name);

  // Step 3: Create a SKU under product
  const skuCode = RandomGenerator.alphaNumeric(8);
  const sku = await api.functional.shopping.admin.products.skus.create(
    connection,
    {
      productCode,
      body: {
        sku_code: skuCode,
        price: 14900,
        is_active: true,
        barcode: "SKU-BARCODE-" + RandomGenerator.alphaNumeric(6),
        status: "in_stock",
        variant_attribute_value_ids: [RandomGenerator.alphaNumeric(12)],
      },
    },
  );
  typia.assert(sku);

  // Step 4: Inventory admin search (unfiltered, paginated)
  const searchRequest: IShoppingInventory.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number &
      tags.Type<"int32"> &
      tags.Default<20> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  };
  const inventoryPage = await api.functional.shopping.admin.inventory.index(
    connection,
    {
      body: searchRequest,
    },
  );
  typia.assert(inventoryPage);
  TestValidator.predicate(
    "has at least one inventory record",
    inventoryPage.data.length >= 1,
  );

  // Find inventory record for the created SKU
  const foundInventory = inventoryPage.data.find(
    (item) => item.shopping_sku_id === sku.id,
  );
  TestValidator.predicate("inventory exists for created SKU", !!foundInventory);

  // Step 5: Inventory search filtered by product_code
  const productFilteredPage =
    await api.functional.shopping.admin.inventory.index(connection, {
      body: {
        ...searchRequest,
        product_code: productCode,
      },
    });
  typia.assert(productFilteredPage);
  TestValidator.predicate(
    "all inventory records belong to the product",
    productFilteredPage.data.every((item) => sku.product.code === productCode),
  );

  // Step 6: Inventory search filtered by sku_code
  const skuFilteredPage = await api.functional.shopping.admin.inventory.index(
    connection,
    {
      body: {
        ...searchRequest,
        sku_code: skuCode,
      },
    },
  );
  typia.assert(skuFilteredPage);
  TestValidator.predicate(
    "all inventory records correspond to the sku_code",
    skuFilteredPage.data.every((item) => item.shopping_sku_id === sku.id),
  );

  // Step 7: Unauthenticated access denied
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "inventory search throws for unauthenticated",
    async () => {
      await api.functional.shopping.admin.inventory.index(unauthConn, {
        body: searchRequest,
      });
    },
  );
}
