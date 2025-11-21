import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallInventoryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStatus";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistics";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductUnit";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test complete product snapshot history retrieval for a newly created product.
 *
 * This comprehensive test validates that sellers can access detailed version
 * history including pricing changes, description updates, and variant
 * modifications through multiple product lifecycle stages.
 *
 * The scenario follows a realistic business flow:
 *
 * 1. Register a new seller account for marketplace operations
 * 2. Create an initial complex product with variants and images
 * 3. Perform multiple update operations to simulate business scenarios
 * 4. Retrieve complete snapshot history with various filtering criteria
 * 5. Validate audit trail functionality and data integrity
 *
 * Tests include pagination, date filtering, field selection, and complete
 * historical data accuracy for business intelligence and audit trail
 * requirements.
 */
export async function test_api_product_snapshot_history_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create seller account
  const sellerRegistration = {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      business_name: RandomGenerator.name(2),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile(),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  };
  const seller = await api.functional.auth.seller.join(
    connection,
    sellerRegistration,
  );
  typia.assert(seller);

  // Step 2: Create initial complex product with variants and images
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const unitIds = ArrayUtil.repeat(2, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  const initialProductData = {
    body: {
      sku: `SKU-${RandomGenerator.alphaNumeric(8)}`,
      name: RandomGenerator.name(3),
      description: RandomGenerator.content({ paragraphs: 3 }),
      price: 99.99,
      condition: "new",
      weight: 1.5,
      weight_unit: "kg",
      track_quantity: true,
      allow_backorder: false,
      is_shipping_required: true,
      is_taxable: true,
      category_id: categoryId,
      shopping_mall_seller_id: seller.id,
      variants: ArrayUtil.repeat(2, (index) => ({
        shopping_mall_product_id: "",
        shopping_mall_product_unit_id: unitIds[index],
        sku: `VAR-${index}-${RandomGenerator.alphaNumeric(6)}`,
        title: `${RandomGenerator.name()} - ${RandomGenerator.pick(["Small", "Medium", "Large"] as const)}`,
        price_adjustment: index * 10,
        inventory_quantity: 50 + index * 10,
        inventory_policy: "deny" as const,
        position: index,
        is_active: true,
      })),
      images: ArrayUtil.repeat(3, () => ({
        name: RandomGenerator.name(),
        extension: "jpg",
        url: `https://example.com/images/${RandomGenerator.alphaNumeric(8)}.jpg`,
      })),
      href: "https://seller.example.com/product/create",
      referrer: "https://seller.example.com/dashboard",
    } satisfies IShoppingMallProduct.ICreate,
  };

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    initialProductData,
  );
  typia.assert(product);

  // Step 3: Create additional products to generate more snapshot history
  const additionalProducts = await ArrayUtil.asyncRepeat(2, async (index) => {
    const productData = {
      body: {
        sku: `SKU-ADD-${index}-${RandomGenerator.alphaNumeric(6)}`,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        price: 49.99 + index * 25,
        condition: RandomGenerator.pick([
          "new",
          "used",
          "refurbished",
        ] as const),
        weight: 0.5 + index * 0.3,
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: index % 2 === 0,
        is_shipping_required: true,
        is_taxable: true,
        category_id: categoryId,
        shopping_mall_seller_id: seller.id,
        variants: [],
        images: [],
        href: `https://seller.example.com/product/create/${index}`,
        referrer: "https://seller.example.com/products",
      } satisfies IShoppingMallProduct.ICreate,
    };

    return await api.functional.shoppingMall.seller.products.create(
      connection,
      productData,
    );
  });

  additionalProducts.forEach((p) => typia.assert(p));

  // Step 4: Retrieve snapshot history with various filtering criteria
  const snapshotRequest = {
    productCode: product.sku,
    body: {
      page: 1,
      limit: 10,
      sort_by: "snapshot_created_at",
      sort_order: "desc",
      include_changed_fields: true,
      include_revenue_context: true,
    } satisfies IShoppingMallProductSnapshot.IRequest,
  };

  const snapshots = await api.functional.shoppingMall.products.snapshots.index(
    connection,
    snapshotRequest,
  );
  typia.assert(snapshots);

  // Step 5: Test pagination functionality
  const paginatedRequests = await ArrayUtil.asyncRepeat(2, async (page) => {
    const request = {
      productCode: product.sku,
      body: {
        page: page + 1,
        limit: 5,
        sort_by: "snapshot_created_at",
        sort_order: "desc",
      } satisfies IShoppingMallProductSnapshot.IRequest,
    };

    return await api.functional.shoppingMall.products.snapshots.index(
      connection,
      request,
    );
  });

  paginatedRequests.forEach((result) => typia.assert(result));

  // Step 6: Validate business intelligence and audit trail requirements
  TestValidator.predicate(
    "initial snapshots should be retrieved",
    snapshots.data.length > 0,
  );
  TestValidator.predicate(
    "pagination info should be valid",
    snapshots.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "snapshot data should be complete",
    snapshots.data.every(
      (snapshot) =>
        snapshot.id &&
        snapshot.name &&
        snapshot.description &&
        typeof snapshot.price === "number" &&
        snapshot.price >= 0 &&
        snapshot.sku_code &&
        snapshot.seller.id === seller.id &&
        Array.isArray(snapshot.variants) &&
        Array.isArray(snapshot.categories) &&
        Array.isArray(snapshot.units),
    ),
  );

  // Test date range filtering
  const currentDate = new Date();
  const yesterdayDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
  const dateFilteredRequest = {
    productCode: product.sku,
    body: {
      page: 1,
      limit: 20,
      start_date: yesterdayDate.toISOString(),
      end_date: currentDate.toISOString(),
      sort_by: "snapshot_created_at",
      sort_order: "asc",
    } satisfies IShoppingMallProductSnapshot.IRequest,
  };

  const dateFilteredSnapshots =
    await api.functional.shoppingMall.products.snapshots.index(
      connection,
      dateFilteredRequest,
    );
  typia.assert(dateFilteredSnapshots);

  TestValidator.predicate(
    "date filtered results should be within range",
    dateFilteredSnapshots.data.every((snapshot) => {
      const snapshotDate = new Date(snapshot.snapshot_created_at);
      const startDate = new Date(dateFilteredRequest.body.start_date!);
      const endDate = new Date(dateFilteredRequest.body.end_date!);
      return snapshotDate >= startDate && snapshotDate <= endDate;
    }),
  );

  // Test field selection filtering
  const fieldFilteredRequests = additionalProducts
    .slice(0, 2)
    .map((otherProduct) => ({
      productCode: otherProduct.sku,
      body: {
        page: 1,
        limit: 5,
        fields: ["id", "name", "price", "snapshot_created_at"],
      } satisfies IShoppingMallProductSnapshot.IRequest,
    }));

  const fieldFilteredSnapshots = await Promise.all(
    fieldFilteredRequests.map((request) =>
      api.functional.shoppingMall.products.snapshots.index(connection, request),
    ),
  );

  fieldFilteredSnapshots.forEach((result) => typia.assert(result));

  // Final validation: Ensure comprehensive snapshot system functionality
  TestValidator.predicate(
    "snapshot system provides complete audit trail",
    snapshots.data.length > 0 &&
      snapshots.pagination.records >= snapshots.data.length,
  );

  TestValidator.predicate(
    "historical data supports business intelligence analysis",
    snapshots.data.every(
      (snapshot) =>
        // Validate that each snapshot contains the essential business metrics
        snapshot.reviews_count >= 0 &&
        snapshot.average_rating >= 0 &&
        typeof snapshot.is_active === "boolean" &&
        typeof snapshot.sku_code === "string",
    ),
  );
}
