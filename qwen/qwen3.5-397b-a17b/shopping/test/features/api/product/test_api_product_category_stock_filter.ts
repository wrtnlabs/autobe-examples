import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test product filtering by category and stock availability for member users.
 *
 * This test validates the PATCH /shoppingMall/member/products endpoint's filtering capabilities including category filtering, stock availability filtering, price range filtering, and combined filter scenarios. The test authenticates as a member user and verifies that the product listing endpoint correctly applies all filter criteria.
 *
 * Test Flow:
 * 1. Authenticate as a member user via authorize_member_join utility function.
 * 2. Test basic product listing without filters to verify endpoint accessibility.
 * 3. Test category filtering by providing a specific categoryId.
 * 4. Test stock availability filtering with inStock=true parameter.
 * 5. Test price range filtering with minPrice and maxPrice parameters.
 * 6. Test combined filters: categoryId + inStock + price range simultaneously.
 * 7. Test pagination parameters (page and limit) work correctly.
 * 8. Test edge case: empty result set returns valid pagination structure with records=0.
 * 9. Validate response structure includes pagination metadata and data array.
 * 10. Verify typia.assert() passes on all responses confirming type safety.
 *
 * Business Validations:
 * - Category filtering restricts results to products in specified category.
 * - Stock filtering (inStock=true) returns only products with positive inventory.
 * - Price range filters constrain results to products within min/max price bounds.
 * - Multiple filters combine with AND logic correctly.
 * - Empty result sets return valid pagination with records=0, pages=0.
 * - Response structure matches IPageIShoppingMallProduct.ISummary DTO.
 * - All product summaries include required fields: id, name, base_price, category, seller, inStock, createdAt.
 */
export async function test_api_product_category_stock_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // 2. Test basic product listing without filters
  const allProducts = await api.functional.shoppingMall.member.products.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(allProducts);
  TestValidator.predicate("pagination structure valid", () => {
    return (
      typeof allProducts.pagination.current === "number" &&
      typeof allProducts.pagination.limit === "number" &&
      typeof allProducts.pagination.records === "number" &&
      typeof allProducts.pagination.pages === "number"
    );
  });
  TestValidator.predicate("data is array", () => {
    return Array.isArray(allProducts.data);
  });
  // 3. Test stock availability filtering with inStock=true
  const inStockProducts =
    await api.functional.shoppingMall.member.products.index(memberConnection, {
      body: {
        inStock: true,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(inStockProducts);
  TestValidator.predicate("inStock filter applied", () => {
    return inStockProducts.data.every((product) => product.inStock === true);
  });
  // 4. Test price range filtering
  const priceFilteredProducts =
    await api.functional.shoppingMall.member.products.index(memberConnection, {
      body: {
        minPrice: 0,
        maxPrice: 1000000,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(priceFilteredProducts);
  TestValidator.predicate("price range filter applied", () => {
    return priceFilteredProducts.data.every(
      (product) => product.base_price >= 0 && product.base_price <= 1000000,
    );
  });
  // 5. Test combined filters: inStock + price range
  const combinedFilterProducts =
    await api.functional.shoppingMall.member.products.index(memberConnection, {
      body: {
        inStock: true,
        minPrice: 0,
        maxPrice: 500000,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(combinedFilterProducts);
  TestValidator.predicate("combined filters applied correctly", () => {
    return combinedFilterProducts.data.every(
      (product) =>
        product.inStock === true &&
        product.base_price >= 0 &&
        product.base_price <= 500000,
    );
  });
  // 6. Test category filtering with categoryId
  // First get a product to extract its category
  if (allProducts.data.length > 0) {
    const sampleProduct = allProducts.data[0];
    const categoryId = sampleProduct.category.id;
    const categoryFilteredProducts =
      await api.functional.shoppingMall.member.products.index(
        memberConnection,
        {
          body: {
            categoryId: categoryId,
            page: 1,
            limit: 20,
          } satisfies IShoppingMallProduct.IRequest,
        },
      );
    typia.assert(categoryFilteredProducts);
    TestValidator.predicate("category filter applied", () => {
      return categoryFilteredProducts.data.every(
        (product) =>
          product.category.id === categoryId ||
          product.category.parent?.id === categoryId,
      );
    });
  }
  // 7. Test pagination with different page and limit values
  const paginatedProducts =
    await api.functional.shoppingMall.member.products.index(memberConnection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(paginatedProducts);
  TestValidator.equals(
    "pagination limit respected",
    paginatedProducts.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedProducts.pagination.current,
    1,
  );
  TestValidator.predicate("data count within limit", () => {
    return paginatedProducts.data.length <= paginatedProducts.pagination.limit;
  });
  // 8. Test edge case: empty result set with restrictive filters
  // Use extremely high minPrice to get no results
  const emptyResultProducts =
    await api.functional.shoppingMall.member.products.index(memberConnection, {
      body: {
        minPrice: 999999999,
        maxPrice: 1000000000,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(emptyResultProducts);
  TestValidator.predicate("empty result has valid pagination", () => {
    return (
      emptyResultProducts.pagination.records === 0 &&
      emptyResultProducts.pagination.pages === 0 &&
      emptyResultProducts.data.length === 0
    );
  });
  // 9. Validate product summary structure for each product in results
  if (allProducts.data.length > 0) {
    const firstProduct = allProducts.data[0];
    TestValidator.predicate("product has required fields", () => {
      return (
        typeof firstProduct.id === "string" &&
        typeof firstProduct.name === "string" &&
        typeof firstProduct.base_price === "number" &&
        typeof firstProduct.category === "object" &&
        firstProduct.category !== null &&
        typeof firstProduct.seller === "object" &&
        firstProduct.seller !== null &&
        typeof firstProduct.inStock === "boolean" &&
        typeof firstProduct.createdAt === "string"
      );
    });
    TestValidator.predicate("category has required fields", () => {
      return (
        typeof firstProduct.category.id === "string" &&
        typeof firstProduct.category.name === "string"
      );
    });
    TestValidator.predicate("seller has required fields", () => {
      return (
        typeof firstProduct.seller.id === "string" &&
        typeof firstProduct.seller.email === "string"
      );
    });
  }
}
