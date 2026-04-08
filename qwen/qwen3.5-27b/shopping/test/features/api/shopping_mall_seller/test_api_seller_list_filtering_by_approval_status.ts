import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test seller listing with approval status filtering and search capabilities.
 *
 * Validates the comprehensive filtering functionality for seller account management, including approval status filtering, suspension/ban status filtering, email and shop name search, and combined filter intersections. Ensures that pagination works correctly with filters applied and that seller profile data is properly included in responses.
 *
 * Special attention is given to verifying that rejected sellers display rejection_reason and approved sellers display approval_reason when provided by administrators.
 *
 * 1. Setup: Assumes admin authentication is already established via the connection parameter
 * 2. Test approval_status filter: Call PATCH /shoppingMall/sellers with approval_status='pending' and verify only pending sellers returned
 * 3. Test approval_status filter with 'approved' and verify only approved sellers returned
 * 4. Test approval_status filter with 'rejected' and verify only rejected sellers returned
 * 5. Test suspended filter: Call with suspended=true and verify only suspended sellers returned
 * 6. Test suspended filter: Call with suspended=false and verify only non-suspended sellers returned
 * 7. Test banned filter: Call with banned=true and verify only banned sellers returned
 * 8. Test banned filter: Call with banned=false and verify only non-banned sellers returned
 * 9. Test shop_name search: Call with shop_name='coffee' and verify case-insensitive partial matching
 * 10. Test combined filters: approval_status='approved' AND suspended=true, verify intersection
 * 11. Verify pagination works correctly with filters applied
 * 12. Verify rejected sellers show rejection_reason in seller_profile
 * 13. Verify approved sellers show approval_reason in seller_profile (if provided)
 */
export async function test_api_seller_list_filtering_by_approval_status(
  connection: api.IConnection,
): Promise<void> {
  // Note: This test assumes the connection is already authenticated as admin
  // and that sellers already exist in the system with various states
  // as seller creation typically requires a registration flow that may not be
  // directly accessible via the available API functions
  // 2. Test approval_status filter with 'pending'
  const pendingResult = await api.functional.shoppingMall.sellers.index(
    connection,
    {
      body: {
        approval_status: "pending",
        limit: 20,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(pendingResult);
  TestValidator.predicate(
    "pending filter returns only pending sellers",
    pendingResult.data.every((s) => s.approval_status === "pending"),
  );
  // 3. Test approval_status filter with 'approved'
  const approvedResult = await api.functional.shoppingMall.sellers.index(
    connection,
    {
      body: {
        approval_status: "approved",
        limit: 20,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(approvedResult);
  TestValidator.predicate(
    "approved filter returns only approved sellers",
    approvedResult.data.every((s) => s.approval_status === "approved"),
  );
  // 4. Test approval_status filter with 'rejected'
  const rejectedResult = await api.functional.shoppingMall.sellers.index(
    connection,
    {
      body: {
        approval_status: "rejected",
        limit: 20,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(rejectedResult);
  TestValidator.predicate(
    "rejected filter returns only rejected sellers",
    rejectedResult.data.every((s) => s.approval_status === "rejected"),
  );
  // 5. Test suspended filter with true
  const suspendedResult = await api.functional.shoppingMall.sellers.index(
    connection,
    {
      body: {
        suspended: true,
        limit: 20,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(suspendedResult);
  TestValidator.predicate(
    "suspended=true filter returns only suspended sellers",
    suspendedResult.data.every((s) => s.suspended === true),
  );
  // 6. Test suspended filter with false
  const notSuspendedResult = await api.functional.shoppingMall.sellers.index(
    connection,
    {
      body: {
        suspended: false,
        limit: 20,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(notSuspendedResult);
  TestValidator.predicate(
    "suspended=false filter returns only non-suspended sellers",
    notSuspendedResult.data.every((s) => s.suspended === false),
  );
  // 7. Test banned filter with true
  const bannedResult = await api.functional.shoppingMall.sellers.index(
    connection,
    {
      body: {
        banned: true,
        limit: 20,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(bannedResult);
  TestValidator.predicate(
    "banned=true filter returns only banned sellers",
    bannedResult.data.every((s) => s.banned === true),
  );
  // 8. Test banned filter with false
  const notBannedResult = await api.functional.shoppingMall.sellers.index(
    connection,
    {
      body: {
        banned: false,
        limit: 20,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(notBannedResult);
  TestValidator.predicate(
    "banned=false filter returns only non-banned sellers",
    notBannedResult.data.every((s) => s.banned === false),
  );
  // 9. Test shop_name search (case-insensitive partial matching)
  const shopNameSearchResult = await api.functional.shoppingMall.sellers.index(
    connection,
    {
      body: {
        shop_name: "coffee",
        limit: 20,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(shopNameSearchResult);
  TestValidator.predicate(
    "shop_name search returns sellers with matching shop names",
    shopNameSearchResult.data.every((s) =>
      s.seller_profile.shop_name.toLowerCase().includes("coffee"),
    ),
  );
  // 10. Test combined filters: approval_status='approved' AND suspended=true
  const combinedFilterResult = await api.functional.shoppingMall.sellers.index(
    connection,
    {
      body: {
        approval_status: "approved",
        suspended: true,
        limit: 20,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined filters return intersection of criteria",
    combinedFilterResult.data.every(
      (s) => s.approval_status === "approved" && s.suspended === true,
    ),
  );
  // 11. Verify pagination works correctly with filters applied
  const paginatedResult = await api.functional.shoppingMall.sellers.index(
    connection,
    {
      body: {
        approval_status: "approved",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination current page is 1",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    paginatedResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination data length does not exceed limit",
    paginatedResult.data.length <= 10,
  );
  // 12. Verify rejected sellers show rejection_reason in seller_profile
  if (rejectedResult.data.length > 0) {
    const firstRejected = rejectedResult.data[0];
    typia.assert(firstRejected);
    // rejection_reason may be null if admin didn't provide one, but field exists
    TestValidator.predicate(
      "rejected seller has rejection_reason field",
      firstRejected.rejection_reason !== undefined,
    );
  }
  // 13. Verify approved sellers show approval_reason in seller_profile
  if (approvedResult.data.length > 0) {
    const firstApproved = approvedResult.data[0];
    typia.assert(firstApproved);
    // approval_reason may be null if admin didn't provide one, but field exists
    TestValidator.predicate(
      "approved seller has approval_reason field",
      firstApproved.approval_reason !== undefined,
    );
  }
  // Additional validation: Verify seller_profile is included in all responses
  const allResults = [
    ...pendingResult.data,
    ...approvedResult.data,
    ...rejectedResult.data,
  ];
  TestValidator.predicate(
    "all sellers have seller_profile included",
    allResults.every((s) => s.seller_profile !== undefined),
  );
  // Verify seller_profile contains required fields
  if (allResults.length > 0) {
    const sampleSeller = allResults[0];
    typia.assert(sampleSeller);
    TestValidator.predicate(
      "seller_profile has shop_name",
      sampleSeller.seller_profile.shop_name !== undefined,
    );
    TestValidator.predicate(
      "seller_profile has shop_description",
      sampleSeller.seller_profile.shop_description !== undefined,
    );
    TestValidator.predicate(
      "seller_profile has approval_status",
      sampleSeller.seller_profile.approval_status !== undefined,
    );
  }
}
