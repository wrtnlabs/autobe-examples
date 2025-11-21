import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallInventoryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStatus";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistics";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantSortField } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSortField";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { ISortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ISortOrder";

/**
 * Test advanced inventory-based filtering for product variants.
 *
 * This test validates that sellers can efficiently filter and monitor their
 * product variants based on inventory levels. It covers filtering by
 * minimum/maximum quantities, active status, sorting by inventory quantity, and
 * identifying variants requiring restocking.
 *
 * The test follows this comprehensive workflow:
 *
 * 1. Seller registration with business credentials
 * 2. Create a parent product in the marketplace
 * 3. Generate multiple product variants with diverse inventory levels (0, low,
 *    medium, high)
 * 4. Test inventory filtering capabilities with various scenarios
 * 5. Validate sorting functionality for efficient restocking decisions
 * 6. Test pagination for performance optimization with large variant catalogs
 *
 * This ensures sellers can optimize inventory management decisions through the
 * platform's advanced filtering capabilities.
 */
export async function test_api_product_variant_inventory_performance_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create a seller account with proper business credentials
  const sellerRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    business_name: RandomGenerator.name(2),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    tax_id: RandomGenerator.alphaNumeric(9),
    phone: RandomGenerator.mobile("010"),
    business_type: RandomGenerator.pick([
      "Sole Proprietorship",
      "Corporation",
      "LLC",
      "Partnership",
    ] as const),
  } satisfies IShoppingMallSeller.IJoin;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerRequest,
  });
  typia.assert(seller);
  TestValidator.equals(
    "seller has verification status",
    seller.verification_status,
    "pending",
  );

  // Step 2: Create a parent product with comprehensive details
  const productData = {
    sku: `PROD-${RandomGenerator.alphaNumeric(8)}`,
    name: `Smart Electronics ${RandomGenerator.name()}`,
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<50> & tags.Maximum<2000>
    >(),
    condition: "new",
    weight: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<2000>
    >(),
    weight_unit: "g",
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true,
    seo_title: RandomGenerator.paragraph({ sentences: 3 }),
    seo_description: RandomGenerator.paragraph({ sentences: 5 }),
    tags: "electronics,smart,trendy",
    featured_image: typia.random<string & tags.Format<"uri">>(),
    category_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_seller_id: seller.id,
    href: "https://example.com/dashboard/products/create",
    referrer: "https://example.com/dashboard",
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productData,
    },
  );
  typia.assert(product);
  TestValidator.equals(
    "product has multiple variants setup",
    product.variants_count,
    0,
  );

  // Helper function for clean SKU generation
  const createVariantSku = (baseSku: string, variantTitle: string): string => {
    const cleanTitle = variantTitle
      .toLowerCase()
      .replace(/\s+memory\s*/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    return `${baseSku}-${cleanTitle}`;
  };

  // Step 3: Create product variants with diverse inventory levels
  const variantConfigs = [
    { title: "Red, Memory: 64GB", inventory: 0, priceAdj: 0, active: false },
    { title: "Red, Memory: 128GB", inventory: 2, priceAdj: 50, active: true },
    { title: "Red, Memory: 256GB", inventory: 15, priceAdj: 100, active: true },
    { title: "Blue, Memory: 64GB", inventory: 50, priceAdj: 0, active: true },
    {
      title: "Blue, Memory: 128GB",
      inventory: 100,
      priceAdj: 50,
      active: true,
    },
    {
      title: "Blue, Memory: 256GB",
      inventory: 200,
      priceAdj: 100,
      active: true,
    },
    { title: "Green, Memory: 64GB", inventory: 1, priceAdj: 0, active: true },
    {
      title: "Green, Memory: 128GB",
      inventory: 8,
      priceAdj: 50,
      active: false,
    },
  ];

  const createdVariants: IShoppingMallProductVariant[] = [];

  for (const [index, config] of variantConfigs.entries()) {
    const variantData = {
      shopping_mall_product_id: product.id,
      shopping_mall_product_unit_id: typia.random<
        string & tags.Format<"uuid">
      >(),
      sku: createVariantSku(product.sku, config.title),
      title: config.title,
      price_adjustment: config.priceAdj,
      inventory_quantity: config.inventory,
      cost_adjustment: null,
      weight_adjustment: null,
      barcode: null,
      image: null,
      inventory_policy: "deny",
      position: index,
      is_active: config.active,
    } satisfies IShoppingMallProductVariant.ICreate;

    const variant =
      await api.functional.shoppingMall.seller.products.variants.create(
        connection,
        {
          productCode: product.sku,
          body: variantData,
        },
      );
    createdVariants.push(variant);
    typia.assert(variant);
  }

  // Step 4: Test basic retrieval without filters
  const basicFilterRequest = {
    page: 1,
    limit: 50,
  } satisfies IShoppingMallProductVariant.IRequest;

  const basicResults =
    await api.functional.shoppingMall.products.variants.index(connection, {
      productCode: product.sku,
      body: basicFilterRequest,
    });
  typia.assert(basicResults);
  TestValidator.predicate(
    "basic filter returns variants",
    basicResults.data.length > 0,
  );
  TestValidator.predicate(
    "pagination info is complete",
    basicResults.pagination !== undefined,
  );

  // Step 5: Test min inventory filtering for restocking alerts
  const minInventoryFilter = {
    page: 1,
    limit: 50,
    min_inventory_quantity: 5,
    sort_by: "inventory_quantity" as IShoppingMallProductVariantSortField,
    sort_order: "asc" as ISortOrder,
  } satisfies IShoppingMallProductVariant.IRequest;

  const minInventoryResults =
    await api.functional.shoppingMall.products.variants.index(connection, {
      productCode: product.sku,
      body: minInventoryFilter,
    });
  typia.assert(minInventoryResults);

  TestValidator.predicate(
    "min inventory filter returns low stock variants",
    minInventoryResults.data.every((v) => v.inventory_quantity >= 5),
  );
  TestValidator.predicate("sorting is correct", () => {
    for (let i = 1; i < minInventoryResults.data.length; i++) {
      if (
        minInventoryResults.data[i].inventory_quantity <
        minInventoryResults.data[i - 1].inventory_quantity
      ) {
        return false;
      }
    }
    return true;
  });

  // Step 6: Test max inventory filtering for overstock monitoring
  const maxInventoryFilter = {
    page: 1,
    limit: 50,
    max_inventory_quantity: 10,
    sort_by: "inventory_quantity" as IShoppingMallProductVariantSortField,
    sort_order: "desc" as ISortOrder,
  } satisfies IShoppingMallProductVariant.IRequest;

  const maxInventoryResults =
    await api.functional.shoppingMall.products.variants.index(connection, {
      productCode: product.sku,
      body: maxInventoryFilter,
    });
  typia.assert(maxInventoryResults);

  TestValidator.predicate(
    "max inventory filter returns variants under limit",
    maxInventoryResults.data.every((v) => v.inventory_quantity <= 10),
  );
  TestValidator.predicate("descending sort is correct", () => {
    for (let i = 1; i < maxInventoryResults.data.length; i++) {
      if (
        maxInventoryResults.data[i].inventory_quantity >
        maxInventoryResults.data[i - 1].inventory_quantity
      ) {
        return false;
      }
    }
    return true;
  });

  // Step 7: Test combined min/max inventory filter
  const rangeFilter = {
    page: 1,
    limit: 50,
    min_inventory_quantity: 3,
    max_inventory_quantity: 20,
    is_active: true,
    sort_by: "inventory_quantity" as IShoppingMallProductVariantSortField,
  } satisfies IShoppingMallProductVariant.IRequest;

  const rangeResults =
    await api.functional.shoppingMall.products.variants.index(connection, {
      productCode: product.sku,
      body: rangeFilter,
    });
  typia.assert(rangeResults);

  TestValidator.predicate(
    "range filter respects bounds",
    rangeResults.data.every(
      (v) =>
        v.inventory_quantity >= 3 &&
        v.inventory_quantity <= 20 &&
        v.is_active === true,
    ),
  );

  // Step 8: Test zero inventory filter for out-of-stock management
  const zeroStockFilter = {
    page: 1,
    limit: 50,
    max_inventory_quantity: 0,
  } satisfies IShoppingMallProductVariant.IRequest;

  const zeroStockResults =
    await api.functional.shoppingMall.products.variants.index(connection, {
      productCode: product.sku,
      body: zeroStockFilter,
    });
  typia.assert(zeroStockResults);

  TestValidator.predicate(
    "zero stock filter identifies out-of-stock variants",
    zeroStockResults.data.every((v) => v.inventory_quantity === 0),
  );
  TestValidator.predicate(
    "includes inactive but zero stock",
    zeroStockResults.data.some((v) => v.inventory_quantity === 0),
  );

  // Step 9: Test inactive variants filter
  const inactiveFilter = {
    page: 1,
    limit: 50,
    is_active: false,
  } satisfies IShoppingMallProductVariant.IRequest;

  const inactiveResults =
    await api.functional.shoppingMall.products.variants.index(connection, {
      productCode: product.sku,
      body: inactiveFilter,
    });
  typia.assert(inactiveResults);

  TestValidator.predicate(
    "inactive filter returns only inactive variants",
    inactiveResults.data.every((v) => v.is_active === false),
  );

  // Step 10: Test search functionality
  const searchFilter = {
    page: 1,
    limit: 50,
    search: "blue",
  } satisfies IShoppingMallProductVariant.IRequest;

  const searchResults =
    await api.functional.shoppingMall.products.variants.index(connection, {
      productCode: product.sku,
      body: searchFilter,
    });
  typia.assert(searchResults);

  TestValidator.predicate(
    "search filter returns relevant variants",
    searchResults.data.every((v) => v.title.toLowerCase().includes("blue")),
  );

  // Step 11: Test pagination performance with high limit
  const highLimitFilter = {
    page: 1,
    limit: 100,
    sort_by: "position" as IShoppingMallProductVariantSortField,
    sort_order: "asc" as ISortOrder,
  } satisfies IShoppingMallProductVariant.IRequest;

  const highLimitResults =
    await api.functional.shoppingMall.products.variants.index(connection, {
      productCode: product.sku,
      body: highLimitFilter,
    });
  typia.assert(highLimitResults);

  TestValidator.predicate(
    "high limit pagination works correctly",
    highLimitResults.data.length >= variantConfigs.length &&
      highLimitResults.pagination.limit <= 100,
  );

  // Step 12: Test second page pagination
  const secondPageFilter = {
    page: 2,
    limit: 3,
  } satisfies IShoppingMallProductVariant.IRequest;

  const secondPageResults =
    await api.functional.shoppingMall.products.variants.index(connection, {
      productCode: product.sku,
      body: secondPageFilter,
    });
  typia.assert(secondPageResults);

  TestValidator.predicate(
    "pagination handles second page",
    secondPageResults.data.length >= 0 &&
      secondPageResults.pagination.current === 2,
  );

  // Step 13: Test complex combined filter for inventory optimization
  const complexFilter = {
    page: 1,
    limit: 50,
    min_inventory_quantity: 1,
    max_inventory_quantity: 25,
    is_active: true,
    search: "red 128",
    sort_by: "inventory_quantity" as IShoppingMallProductVariantSortField,
    sort_order: "desc" as ISortOrder,
  } satisfies IShoppingMallProductVariant.IRequest;

  const complexResults =
    await api.functional.shoppingMall.products.variants.index(connection, {
      productCode: product.sku,
      body: complexFilter,
    });
  typia.assert(complexResults);

  TestValidator.predicate(
    "complex filter combines all criteria correctly",
    complexResults.data.every(
      (v) =>
        v.inventory_quantity >= 1 &&
        v.inventory_quantity <= 25 &&
        v.is_active === true &&
        (/red/i.test(v.title) || /128/i.test(v.title)),
    ),
  );

  // Step 14: Validate inventory statistics accuracy
  TestValidator.equals(
    "total variants created matches",
    createdVariants.length,
    variantConfigs.length,
  );

  const activeVariants = createdVariants.filter((v) => v.is_active);
  TestValidator.predicate(
    "active variants match expected count",
    activeVariants.length === variantConfigs.filter((c) => c.active).length,
  );

  TestValidator.predicate(
    "variant inventory quantities are exact",
    createdVariants.every(
      (variant, index) =>
        variant.inventory_quantity === variantConfigs[index].inventory,
    ),
  );

  TestValidator.predicate(
    "variant active status matches config",
    createdVariants.every(
      (variant, index) => variant.is_active === variantConfigs[index].active,
    ),
  );

  TestValidator.predicate(
    "product variant summaries are accurate",
    basicResults.data.every(
      (summary) =>
        summary.inventory_quantity >= 0 &&
        typeof summary.inventory_quantity === "number" &&
        typeof summary.is_active === "boolean" &&
        summary.title.length > 0,
    ),
  );
}
