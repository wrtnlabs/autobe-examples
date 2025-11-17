import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventory";
import type { IShoppingMallInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingMallCategory";

/**
 * This E2E test validates inventory searching by an authenticated seller for a
 * specified product variant SKU. It ensures the seller can perform listing with
 * pagination, filtering by quantity, reserved quantity, and restock date range.
 * Steps:
 *
 * 1. Seller joins the system (authentication).
 * 2. Creates a shopping mall product.
 * 3. Creates a SKU under the product.
 * 4. Performs inventory searches with no filters, verifying pagination setup.
 * 5. Tests filtering inventories by quantity min/max.
 * 6. Tests filtering inventories by reserved quantity min/max.
 * 7. Tests filtering inventories by restock date range.
 * 8. Verifies all responses with typia.assert and business rules with
 *    TestValidator.
 */
export async function test_api_shopping_mall_product_variant_inventory_search_by_seller(
  connection: api.IConnection,
) {
  // Seller joins
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "validPassword123",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Create shopping mall product
  const productCode = `product-${RandomGenerator.alphaNumeric(8)}`;
  // Use minimal category object for category_code
  const category: IShoppingMallShoppingMallCategory.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: "Default Category",
  };
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.shoppingMallProducts.create(
      connection,
      {
        body: {
          code: productCode,
          title: "Test Product",
          description: "Test product description",
          brand: "Test Brand",
          category_code: category.id,
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);
  TestValidator.equals("product code matches", product.code, productCode);

  // Create product variant SKU
  const skuCode = `sku-${RandomGenerator.alphaNumeric(8)}`;
  const variant: IShoppingMallProductVariant =
    await api.functional.shoppingMall.seller.shoppingMallProducts.shoppingMallProductVariants.create(
      connection,
      {
        productCode,
        body: {
          shopping_mall_product_id: product.id,
          sku_code: skuCode,
          color: "red",
          size: "M",
          option: null,
          price: 9999,
          status: "in stock",
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  TestValidator.equals("sku code matches", variant.sku_code, skuCode);

  // Base inventory request for pagination and filters
  const baseRequest = {
    page: 1,
    limit: 5,
    quantity_min: null,
    quantity_max: null,
    reserved_quantity_min: null,
    reserved_quantity_max: null,
    restock_date_from: null,
    restock_date_to: null,
  } satisfies IShoppingMallInventory.IRequest;

  // Search inventories with no filters
  const searchResult =
    await api.functional.shoppingMall.seller.shoppingMallProductVariants.shoppingMallInventories.index(
      connection,
      {
        skuCode,
        body: baseRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate(
    "pagination current page must be 1",
    searchResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit must be 5",
    searchResult.pagination.limit === 5,
  );
  TestValidator.predicate(
    "pagination pages must be >= 1",
    searchResult.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination records >= data length",
    searchResult.pagination.records >= searchResult.data.length,
  );

  // If multiple pages, test second page
  if (searchResult.pagination.pages >= 2) {
    const secondPage =
      await api.functional.shoppingMall.seller.shoppingMallProductVariants.shoppingMallInventories.index(
        connection,
        {
          skuCode,
          body: { ...baseRequest, page: 2 },
        },
      );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page current page",
      secondPage.pagination.current,
      2,
    );
  }

  // Filtering tests
  // quantity_min
  const quantity_min = 10;
  const filteredByQuantityMin =
    await api.functional.shoppingMall.seller.shoppingMallProductVariants.shoppingMallInventories.index(
      connection,
      {
        skuCode,
        body: { ...baseRequest, quantity_min },
      },
    );
  typia.assert(filteredByQuantityMin);
  filteredByQuantityMin.data.forEach((inv) => {
    TestValidator.predicate(
      `quantity_min filter check for inventory ${inv.id}`,
      inv.quantity >= quantity_min,
    );
  });

  // quantity_max
  const quantity_max = 100;
  const filteredByQuantityMax =
    await api.functional.shoppingMall.seller.shoppingMallProductVariants.shoppingMallInventories.index(
      connection,
      {
        skuCode,
        body: { ...baseRequest, quantity_max },
      },
    );
  typia.assert(filteredByQuantityMax);
  filteredByQuantityMax.data.forEach((inv) => {
    TestValidator.predicate(
      `quantity_max filter check for inventory ${inv.id}`,
      inv.quantity <= quantity_max,
    );
  });

  // reserved_quantity_min
  const reserved_quantity_min = 5;
  const filteredByReservedMin =
    await api.functional.shoppingMall.seller.shoppingMallProductVariants.shoppingMallInventories.index(
      connection,
      {
        skuCode,
        body: { ...baseRequest, reserved_quantity_min },
      },
    );
  typia.assert(filteredByReservedMin);
  filteredByReservedMin.data.forEach((inv) => {
    TestValidator.predicate(
      `reserved_quantity_min filter check for inventory ${inv.id}`,
      inv.reserved_quantity >= reserved_quantity_min,
    );
  });

  // reserved_quantity_max
  const reserved_quantity_max = 50;
  const filteredByReservedMax =
    await api.functional.shoppingMall.seller.shoppingMallProductVariants.shoppingMallInventories.index(
      connection,
      {
        skuCode,
        body: { ...baseRequest, reserved_quantity_max },
      },
    );
  typia.assert(filteredByReservedMax);
  filteredByReservedMax.data.forEach((inv) => {
    TestValidator.predicate(
      `reserved_quantity_max filter check for inventory ${inv.id}`,
      inv.reserved_quantity <= reserved_quantity_max,
    );
  });

  // restock_date_from & restock_date_to
  const now = new Date();
  const restock_date_from = new Date(
    now.getTime() - 7 * 24 * 3600 * 1000,
  ).toISOString();
  const restock_date_to = new Date(
    now.getTime() + 7 * 24 * 3600 * 1000,
  ).toISOString();
  const filteredByRestockDate =
    await api.functional.shoppingMall.seller.shoppingMallProductVariants.shoppingMallInventories.index(
      connection,
      {
        skuCode,
        body: { ...baseRequest, restock_date_from, restock_date_to },
      },
    );
  typia.assert(filteredByRestockDate);
  TestValidator.predicate(
    `restock_date filter count check`,
    filteredByRestockDate.data.length <= filteredByQuantityMax.pagination.limit,
  );
}
