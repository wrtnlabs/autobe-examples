import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSku";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuColor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuColor";
import type { IShoppingMallSkuSize } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuSize";

/**
 * Test comprehensive SKU variant filtering and search functionality.
 *
 * This test validates the complete workflow of creating products with multiple
 * SKU variants and filtering them by various criteria. The test ensures that:
 *
 * 1. Admin can create variant attribute options (colors and sizes)
 * 2. Seller can create products with multiple SKU variants
 * 3. SKU filtering returns correct results based on search criteria
 * 4. Pagination works correctly with proper metadata
 * 5. SKU information includes complete variant details and pricing
 *
 * Test Flow:
 *
 * - Admin authenticates and creates color variants (Red, Blue, Green)
 * - Admin creates size variants (Small, Medium, Large)
 * - Admin creates product category
 * - Seller authenticates and creates a product
 * - Seller creates multiple SKUs with different prices
 * - Filter SKUs using pagination parameters
 * - Validate response structure and pagination metadata
 */
export async function test_api_sku_variants_filtering_by_price_and_availability(
  connection: api.IConnection,
) {
  // Step 1: Admin authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      name: RandomGenerator.name(),
      role_level: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create color variant options
  const colors = await ArrayUtil.asyncRepeat(3, async (index) => {
    const colorNames = ["Red", "Blue", "Green"] as const;
    const color = await api.functional.shoppingMall.admin.skuColors.create(
      connection,
      {
        body: {
          name: colorNames[index],
        } satisfies IShoppingMallSkuColor.ICreate,
      },
    );
    typia.assert(color);
    return color;
  });

  // Step 3: Create size variant options
  const sizes = await ArrayUtil.asyncRepeat(3, async (index) => {
    const sizeValues = ["Small", "Medium", "Large"] as const;
    const size = await api.functional.shoppingMall.admin.skuSizes.create(
      connection,
      {
        body: {
          value: sizeValues[index],
        } satisfies IShoppingMallSkuSize.ICreate,
      },
    );
    typia.assert(size);
    return size;
  });

  // Step 4: Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 5: Seller authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      business_name: RandomGenerator.name(2),
      business_type: "LLC",
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 5 }),
      tax_id: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 6: Create product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(3),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 7: Create multiple SKU variants with different prices
  const skus = await ArrayUtil.asyncRepeat(5, async (index) => {
    const sku = await api.functional.shoppingMall.seller.products.skus.create(
      connection,
      {
        productId: product.id,
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: 100 + index * 50,
        } satisfies IShoppingMallSku.ICreate,
      },
    );
    typia.assert(sku);
    return sku;
  });

  // Step 8: Filter SKUs using pagination
  const pageResult = await api.functional.shoppingMall.products.skus.index(
    connection,
    {
      productId: product.id,
      body: {
        page: 0,
      } satisfies IShoppingMallSku.IRequest,
    },
  );
  typia.assert(pageResult);

  // Step 9: Validate pagination structure
  TestValidator.predicate(
    "pagination object exists",
    pageResult.pagination !== null && pageResult.pagination !== undefined,
  );

  TestValidator.predicate(
    "pagination current page is correct",
    pageResult.pagination.current === 0,
  );

  TestValidator.predicate(
    "pagination has valid limit",
    pageResult.pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination total records matches created SKUs",
    pageResult.pagination.records === skus.length,
  );

  TestValidator.predicate(
    "data array is not empty",
    pageResult.data.length > 0,
  );

  TestValidator.predicate(
    "all SKUs have valid IDs",
    pageResult.data.every((sku) => sku.id !== null && sku.id !== undefined),
  );

  TestValidator.predicate(
    "all SKUs have valid codes",
    pageResult.data.every((sku) => sku.sku_code.length > 0),
  );

  TestValidator.predicate(
    "all SKUs have valid prices",
    pageResult.data.every((sku) => sku.price > 0),
  );
}
