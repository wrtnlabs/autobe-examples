import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_seller_list_browse_approved_sellers(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test basic approved seller listing without filters
  const basicOutput: IPageIEcommerceSeller.ISummary =
    await api.functional.ecommerce.sellers.index(connection, {
      body: {
        approval_status: "approved",
        page: 1,
        limit: 10,
      } satisfies IEcommerceSeller.IRequest,
    });
  typia.assert(basicOutput);
  // 2. Validate pagination metadata
  TestValidator.predicate(
    "current page is positive",
    basicOutput.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is positive",
    basicOutput.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    basicOutput.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    basicOutput.pagination.pages >= 0,
  );
  // 3. Validate pagination consistency
  TestValidator.equals(
    "pages calculated correctly",
    basicOutput.pagination.pages,
    Math.ceil(basicOutput.pagination.records / basicOutput.pagination.limit),
  );
  // 4. Validate seller records structure if data exists
  if (basicOutput.data.length > 0) {
    const seller = basicOutput.data[0];
    typia.assert(seller);
    // Business logic validation: shop_name must be non-empty
    TestValidator.predicate(
      "shop_name is non-empty",
      seller.shop_name.length > 0,
    );
  }
  // 5. Test with pagination parameters
  const paginatedOutput: IPageIEcommerceSeller.ISummary =
    await api.functional.ecommerce.sellers.index(connection, {
      body: {
        approval_status: "approved",
        page: 2,
        limit: 5,
      } satisfies IEcommerceSeller.IRequest,
    });
  typia.assert(paginatedOutput);
  // 6. Verify page 2 has correct pagination metadata
  TestValidator.equals(
    "page 2 requested",
    paginatedOutput.pagination.current,
    2,
  );
  TestValidator.equals(
    "limit 5 requested",
    paginatedOutput.pagination.limit,
    5,
  );
  // 7. Test with no approval_status filter (should return all sellers)
  const allOutput: IPageIEcommerceSeller.ISummary =
    await api.functional.ecommerce.sellers.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceSeller.IRequest,
    });
  typia.assert(allOutput);
  // 8. Validate all sellers have required fields
  if (allOutput.data.length > 0) {
    for (const seller of allOutput.data) {
      typia.assert(seller);
      // Business logic validation: shop_name must be non-empty
      TestValidator.predicate(
        "all sellers have shop_name",
        seller.shop_name.length > 0,
      );
    }
  }
}
