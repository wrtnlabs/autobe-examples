import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_search_basic_text_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Search for products containing 'electronics' with pagination
  const requestBody = {
    search: "electronics",
    page: 1 satisfies number as number,
    limit: 20 satisfies number as number,
  } satisfies IEcommerceProduct.IRequest;
  // Call the search endpoint
  const response = await api.functional.ecommerce.search(connection, {
    body: requestBody,
  });
  typia.assert(response);
  // Validate pagination metadata
  const { pagination, data } = response;
  TestValidator.equals("current page", pagination.current, 1);
  TestValidator.equals("limit", pagination.limit, 20);
  TestValidator.predicate("total records >= 0", pagination.records >= 0);
  TestValidator.predicate("total pages >= 0", pagination.pages >= 0);
  // Only test calculation when we have records to avoid division by zero
  if (pagination.records > 0) {
    TestValidator.predicate(
      "total pages matches calculation",
      () =>
        pagination.pages === Math.ceil(pagination.records / pagination.limit),
    );
  }
  // Validate data array matches pagination
  TestValidator.predicate(
    "data length <= limit",
    data.length <= pagination.limit,
  );
  if (data.length > 0) {
    // Verify at least one product name contains 'electronics' (case-insensitive)
    // This tests that partial text search works without requiring all products to match
    TestValidator.predicate(
      "at least one product matches search term",
      data.some((product) =>
        product.name.toLowerCase().includes("electronics"),
      ),
    );
    // Validate all products have sellers with 'approved' status
    // This ensures seller account status filtering works correctly
    for (const product of data) {
      TestValidator.equals(
        `seller account status approved: ${product.seller.shop_name}`,
        product.seller.account_status,
        "approved",
      );
      // Validate nested structures
      typia.assert(product.seller);
      typia.assert(product.category);
      // Ensure no products from suspended or unapproved sellers
      TestValidator.predicate(
        "seller not suspended or rejected",
        product.seller.account_status !== "suspended" &&
          product.seller.account_status !== "rejected" &&
          product.seller.account_status !== "pending_approval",
      );
    }
  }
  // If data is empty but records > 0, it's still valid (could be pagination boundary)
  // No need for explicit test of empty data case
}
