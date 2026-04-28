import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Tests email-based seller search using partial ILIKE '%{email}%' substring matching.
 *
 * Validates the search correctly identifies sellers matching email substrings, confirms
 * case-insensitive email matching functionality, verifies pagination works when partial
 * result sets are returned, and ensures non-matching searches return empty results
 * with correct pagination metadata (records: 0, pages: 0).
 * Search responses contain seller summaries with id, email, approvalStatus,
 * and sellerProfile information.
 *
 * 1. Search using common email substring that should match multiple sellers
 * 2. Validate response structure matches IPageIEcommercePlatformSeller.ISummary
 * 3. Check each seller record contains required id, email, approvalStatus, sellerProfile fields
 * 4. Test case-insensitive matching by searching with uppercase substring
 * 5. Verify pagination metadata when results are returned
 * 6. Search with impossible non-matching email to confirm empty results
 * 7. Assert empty result pagination shows records: 0, pages: 0
 */
export async function test_api_seller_search_by_email_partial_match(
  connection: api.IConnection,
) {
  // 1. Search using common email substring that should match multiple sellers
  const searchResult = await api.functional.ecommercePlatform.sellers.index(
    connection,
    {
      body: { email: "test" } satisfies IEcommercePlatformSeller.IRequest,
    },
  );
  typia.assert(searchResult);
  // 2. Validate pagination structure exists
  TestValidator.equals(
    "search response has pagination",
    typeof searchResult.pagination,
    "object",
  );
  TestValidator.predicate(
    "pagination is not null",
    searchResult.pagination !== null,
  );
  TestValidator.predicate(
    "search response has data array",
    Array.isArray(searchResult.data),
  );
  // 3. Validate each returned seller record
  await ArrayUtil.asyncForEach(searchResult.data, async (seller) => {
    typia.assert<IEcommercePlatformSeller.ISummary>(seller);
    TestValidator.predicate(
      "seller has valid UUID id",
      typeof seller.id === "string",
    );
    TestValidator.equals("seller email exists", typeof seller.email, "string");
    TestValidator.predicate(
      "seller has approvalStatus",
      typeof seller.approvalStatus === "string",
    );
    TestValidator.predicate(
      "seller has sellerProfile object",
      typeof seller.sellerProfile === "object",
    );
    TestValidator.predicate(
      "seller has sellerProfile id",
      typeof seller.sellerProfile.id === "string",
    );
    // Verify email contains the search substring (case-insensitive check)
    TestValidator.predicate(
      "seller email contains search substring",
      seller.email.toLowerCase().includes("test"),
    );
  });
  // 4. Test case-insensitive matching with uppercase search term
  const caseInsensitiveResult =
    await api.functional.ecommercePlatform.sellers.index(connection, {
      body: { email: "TEST" } satisfies IEcommercePlatformSeller.IRequest,
    });
  typia.assert(caseInsensitiveResult);
  // Verify uppercase search returns matching sellers (case-insensitive)
  await ArrayUtil.asyncForEach(caseInsensitiveResult.data, async (seller) => {
    TestValidator.predicate(
      "case-insensitive search finds sellers",
      seller.email.toLowerCase().includes("test"),
    );
  });
  // 5. Validate pagination metadata when results exist
  TestValidator.predicate(
    "results exist when searching common substring",
    searchResult.data.length > 0,
  );
  TestValidator.predicate(
    "pagination records matches data length",
    searchResult.pagination.records === searchResult.data.length,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    searchResult.pagination.limit > 0,
  );
  // 6. Search with impossible non-matching email to verify empty results
  const emptyResult = await api.functional.ecommercePlatform.sellers.index(
    connection,
    {
      body: {
        email: "xyznonexistent9876543210@impossibledomain.invalid",
      } satisfies IEcommercePlatformSeller.IRequest,
    },
  );
  typia.assert(emptyResult);
  // 7. Assert empty result pagination shows records: 0, pages: 0
  TestValidator.equals("empty result has no data", emptyResult.data.length, 0);
  TestValidator.equals(
    "empty result records is 0",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result pages is 0",
    emptyResult.pagination.pages,
    0,
  );
}
