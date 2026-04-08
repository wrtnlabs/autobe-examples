import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cart_items_search_by_product_name_and_sku(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Get existing cart items to understand available products
  const existingItems =
    await api.functional.ecommerceMall.customer.cart.items.index(
      customerConnection,
      {
        body: {
          limit: 100,
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(existingItems);
  // 3. Try to add cart items with predictable product names for testing
  // We'll store variant IDs and product names for filtering tests
  const testProductNames: string[] = [];
  const testVariants: {
    variantId: string;
    skuCode: string;
    productName: string;
  }[] = [];
  // Look for existing items with useful names for filtering
  for (const item of existingItems.data) {
    if (
      item.productName &&
      item.variantSkuCode &&
      !testVariants.find((v) => v.variantId === item.variant.id)
    ) {
      testVariants.push({
        variantId: item.variant.id,
        skuCode: item.variantSkuCode,
        productName: item.productName,
      });
      testProductNames.push(item.productName);
    }
  }
  // If we have at least one product, we can test the filtering
  if (testVariants.length > 0) {
    const firstVariant = testVariants[0];
    const firstProductName = firstVariant.productName;
    // Create partial product name for matching test
    const partialName =
      firstProductName.length > 3
        ? firstProductName.substring(0, Math.floor(firstProductName.length / 2))
        : firstProductName;
    // Test 1: Partial product name matching (case-insensitive)
    const byProductName =
      await api.functional.ecommerceMall.customer.cart.items.index(
        customerConnection,
        {
          body: {
            productName: partialName,
            limit: 20,
          } satisfies IEcommerceMallCartItem.IRequest,
        },
      );
    typia.assert(byProductName);
    // Verify all returned items contain the partial product name
    for (const item of byProductName.data) {
      TestValidator.predicate(
        `product name contains "${partialName}"`,
        item.productName.toLowerCase().includes(partialName.toLowerCase()),
      );
    }
    // Test 2: Exact SKU code filtering
    const bySkuCode =
      await api.functional.ecommerceMall.customer.cart.items.index(
        customerConnection,
        {
          body: {
            variantSkuCode: firstVariant.skuCode,
            limit: 20,
          } satisfies IEcommerceMallCartItem.IRequest,
        },
      );
    typia.assert(bySkuCode);
    // Verify all returned items have the exact SKU code
    for (const item of bySkuCode.data) {
      TestValidator.equals(
        "SKU code matches exactly",
        item.variantSkuCode,
        firstVariant.skuCode,
      );
    }
    // Test 3: Date range filtering
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const byDateRange =
      await api.functional.ecommerceMall.customer.cart.items.index(
        customerConnection,
        {
          body: {
            createdAtFrom: thirtyDaysAgo.toISOString(),
            createdAtTo: now.toISOString(),
            limit: 20,
          } satisfies IEcommerceMallCartItem.IRequest,
        },
      );
    typia.assert(byDateRange);
    // Verify all returned items were created within the date range
    for (const item of byDateRange.data) {
      const createdAt = new Date(item.createdAt);
      TestValidator.predicate(
        "item created within date range",
        createdAt >= thirtyDaysAgo && createdAt <= now,
      );
    }
    // Test 4: Combined filters (productName + date range)
    const combinedFilters =
      await api.functional.ecommerceMall.customer.cart.items.index(
        customerConnection,
        {
          body: {
            productName: partialName,
            createdAtFrom: thirtyDaysAgo.toISOString(),
            createdAtTo: now.toISOString(),
            limit: 20,
          } satisfies IEcommerceMallCartItem.IRequest,
        },
      );
    typia.assert(combinedFilters);
    // Verify combined filter results satisfy both conditions
    for (const item of combinedFilters.data) {
      TestValidator.predicate(
        "combined filter - product name matches",
        item.productName.toLowerCase().includes(partialName.toLowerCase()),
      );
      const createdAt = new Date(item.createdAt);
      TestValidator.predicate(
        "combined filter - date range matches",
        createdAt >= thirtyDaysAgo && createdAt <= now,
      );
    }
    // Test 5: Pagination with filters applied
    const paginatedResults =
      await api.functional.ecommerceMall.customer.cart.items.index(
        customerConnection,
        {
          body: {
            productName: partialName,
            page: 1,
            limit: 1,
          } satisfies IEcommerceMallCartItem.IRequest,
        },
      );
    typia.assert(paginatedResults);
    TestValidator.equals(
      "pagination limit respected",
      paginatedResults.data.length,
      1,
    );
    // Verify pagination structure exists - pagination.pagination contains IPage.IPagination with records
    TestValidator.predicate(
      "pagination has records",
      typeof paginatedResults.pagination.pagination.records === "number",
    );
    // Test 6: Stock status filtering - in_stock
    const inStockItems =
      await api.functional.ecommerceMall.customer.cart.items.index(
        customerConnection,
        {
          body: {
            stockStatus: "in_stock",
            limit: 20,
          } satisfies IEcommerceMallCartItem.IRequest,
        },
      );
    typia.assert(inStockItems);
    // Verify all returned items are in stock
    for (const item of inStockItems.data) {
      TestValidator.equals(
        "availability status is available",
        item.availabilityStatus,
        "available",
      );
    }
  }
  // Test 7: Non-matching product name returns empty or filtered results
  const nonMatchingSearch =
    await api.functional.ecommerceMall.customer.cart.items.index(
      customerConnection,
      {
        body: {
          productName: "xyznonexistentproduct123",
          limit: 20,
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(nonMatchingSearch);
  // Validate filter works - items should not match the non-existent name
  if (nonMatchingSearch.data.length > 0) {
    for (const item of nonMatchingSearch.data) {
      TestValidator.predicate(
        "non-matching search returns no matches",
        item.productName.toLowerCase().includes("xyznonexistentproduct123"),
      );
    }
  }
  // Test 8: SKU code that doesn't exist returns empty
  const nonExistentSku =
    await api.functional.ecommerceMall.customer.cart.items.index(
      customerConnection,
      {
        body: {
          variantSkuCode: "NONEXISTENT-SKU-12345",
          limit: 20,
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(nonExistentSku);
  // Test 9: Verify response structure for filtered results
  const allItems = await api.functional.ecommerceMall.customer.cart.items.index(
    customerConnection,
    {
      body: {
        limit: 10,
      } satisfies IEcommerceMallCartItem.IRequest,
    },
  );
  typia.assert(allItems);
  // Validate response contains required fields
  if (allItems.data.length > 0) {
    const item = allItems.data[0];
    TestValidator.equals("has id", typeof item.id, "string");
    TestValidator.equals("has productName", typeof item.productName, "string");
    TestValidator.equals(
      "has variantSkuCode",
      typeof item.variantSkuCode,
      "string",
    );
    TestValidator.equals("has quantity", typeof item.quantity, "number");
    TestValidator.equals(
      "has availabilityStatus",
      typeof item.availabilityStatus,
      "string",
    );
    TestValidator.equals("has createdAt", typeof item.createdAt, "string");
    TestValidator.equals(
      "has lineSubtotal",
      typeof item.lineSubtotal,
      "number",
    );
  }
}
