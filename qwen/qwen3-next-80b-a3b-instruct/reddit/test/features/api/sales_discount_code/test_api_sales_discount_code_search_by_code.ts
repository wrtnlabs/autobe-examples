import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformSaleDiscountCode } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleDiscountCode";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSaleDiscountCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSaleDiscountCode";
export async function test_api_sales_discount_code_search_by_code(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Generate a valid discount code for testing
  const testCode = "SUMMER2024";
  // Step 2: Create request body with exact code search parameter
  // Use the exact structure from ICommunityPlatformSaleDiscountCode.IRequest
  const searchRequest = {
    code: testCode,
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformSaleDiscountCode.IRequest;
  // Step 3: Call the API endpoint to search for discount codes by exact code match
  const result: IPageICommunityPlatformSaleDiscountCode.ISummary =
    await api.functional.communityPlatform.salesdiscountcodes.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(result);
  // Step 4: Validate that the search result contains the exact discount code we searched for
  // Ensure the returned data array is not empty
  TestValidator.predicate(
    "search returned at least one result",
    result.data.length > 0,
  );
  // Verify that the first result's code matches our search term exactly
  TestValidator.equals(
    "searched discount code matches returned code",
    result.data[0].code,
    testCode,
  );
  // Validate pagination metadata is correct
  TestValidator.equals(
    "pagination page matches request",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    result.pagination.limit,
    10,
  );
  // Ensure at least one discount code is returned, which confirms the search functionality works
  // This validates the core functionality: search by exact code match
}
