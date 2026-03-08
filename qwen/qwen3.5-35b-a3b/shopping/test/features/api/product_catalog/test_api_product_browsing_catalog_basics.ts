import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_browsing_catalog_basics(
  connection: api.IConnection,
): Promise<void> {
  // 1. Access product catalog endpoint (public endpoint, no auth required)
  const catalogResponse = await api.functional.ecommerceMall.products.index(
    connection,
    { body: {} },
  );
  typia.assert(catalogResponse);
  // 2. Validate response structure
  typia.assert(catalogResponse.data);
  typia.assert(catalogResponse.pagination);
  // 3. Validate pagination metadata
  const pagination = catalogResponse.pagination;
  TestValidator.equals("pagination current page is 1", pagination.current, 1);
  TestValidator.equals("pagination limit is 20", pagination.limit, 20);
  TestValidator.predicate(
    "pagination records non-negative",
    pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    pagination.pages,
    pagination.records > 0
      ? Math.ceil(pagination.records / pagination.limit)
      : 0,
  );
  // 4. Validate products array and business logic
  if (catalogResponse.data.length === 0) {
    TestValidator.predicate("empty catalog is valid response", true);
  } else {
    // 5. Validate each product has all required fields (business logic)
    for (const product of catalogResponse.data) {
      typia.assert(product);
      // Validate that only active products are returned (business rule)
      TestValidator.equals(
        "product is active (catalog filter)",
        product.is_active,
        true,
      );
      // Validate seller has valid approval_status enum value (business logic)
      typia.assert(product.seller);
      TestValidator.predicate(
        "seller approval_status is valid enum",
        ["pending", "approved", "rejected"].includes(
          product.seller.approval_status,
        ),
      );
      // Validate category exists with required fields
      typia.assert(product.category);
    }
    // 6. Validate pagination metadata matches actual data
    TestValidator.equals(
      "pagination limit matches expected value",
      pagination.limit,
      20,
    );
    // 7. Validate total records count is at least as many as returned
    TestValidator.predicate(
      "pagination records covers all data",
      pagination.records >= catalogResponse.data.length,
    );
  }
}
