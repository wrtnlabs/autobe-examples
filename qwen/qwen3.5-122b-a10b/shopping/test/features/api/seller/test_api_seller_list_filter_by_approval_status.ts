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

export async function test_api_seller_list_filter_by_approval_status(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test filtering seller accounts by approval workflow status for administrative oversight.
   *
   * Validates the administrative seller filtering functionality by testing approval status filters, combined filters with suspension status, and pagination metadata. Ensures that filtering returns only sellers matching the specified criteria and that all response fields are properly populated.
   *
   * 1. Filter sellers by approval_status = 'pending' and verify only pending sellers returned.
   * 2. Filter sellers by approval_status = 'approved' and verify only approved sellers returned.
   * 3. Filter sellers by approval_status = 'rejected' and verify only rejected sellers returned.
   * 4. Test combined filters (approval_status + is_suspended).
   * 5. Validate pagination metadata includes correct current page, limit, records, and pages.
   * 6. Validate all seller summary fields are present (id, approval_status, is_suspended, is_banned, created_at, shop_name, shop_description).
   * 7. Test with date range filter combined with approval_status.
   */
  // Create admin connection for seller management operations
  const adminConnection: api.IConnection = { host: connection.host };
  // Test 1: Filter by approval_status = 'pending'
  const pendingResult: IPageIEcommerceSeller.ISummary =
    await api.functional.ecommerce.sellers.index(adminConnection, {
      body: {
        approval_status: "pending",
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IEcommerceSeller.IRequest,
    });
  typia.assert(pendingResult);
  // Validate all returned sellers have pending status
  for (const seller of pendingResult.data) {
    TestValidator.equals(
      "pending filter - status matches",
      seller.approval_status,
      "pending",
    );
  }
  // Test 2: Filter by approval_status = 'approved'
  const approvedResult: IPageIEcommerceSeller.ISummary =
    await api.functional.ecommerce.sellers.index(adminConnection, {
      body: {
        approval_status: "approved",
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IEcommerceSeller.IRequest,
    });
  typia.assert(approvedResult);
  // Validate all returned sellers have approved status
  for (const seller of approvedResult.data) {
    TestValidator.equals(
      "approved filter - status matches",
      seller.approval_status,
      "approved",
    );
  }
  // Test 3: Filter by approval_status = 'rejected'
  const rejectedResult: IPageIEcommerceSeller.ISummary =
    await api.functional.ecommerce.sellers.index(adminConnection, {
      body: {
        approval_status: "rejected",
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IEcommerceSeller.IRequest,
    });
  typia.assert(rejectedResult);
  // Validate all returned sellers have rejected status
  for (const seller of rejectedResult.data) {
    TestValidator.equals(
      "rejected filter - status matches",
      seller.approval_status,
      "rejected",
    );
  }
  // Test 4: Combined filters - approval_status + is_suspended
  const combinedResult: IPageIEcommerceSeller.ISummary =
    await api.functional.ecommerce.sellers.index(adminConnection, {
      body: {
        approval_status: "approved",
        is_suspended: true,
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IEcommerceSeller.IRequest,
    });
  typia.assert(combinedResult);
  // Validate all returned sellers match both criteria
  for (const seller of combinedResult.data) {
    TestValidator.equals(
      "combined filter - status matches",
      seller.approval_status,
      "approved",
    );
    TestValidator.equals(
      "combined filter - suspended matches",
      seller.is_suspended,
      true,
    );
  }
  // Test 5: Validate pagination metadata structure
  TestValidator.predicate(
    "pagination has valid current",
    pendingResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    pendingResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has valid records",
    pendingResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages",
    pendingResult.pagination.pages >= 0,
  );
  // Test 6: Validate seller summary fields are present
  if (pendingResult.data.length > 0) {
    const firstSeller = pendingResult.data[0];
    typia.assertGuard(firstSeller);
    TestValidator.predicate("seller has valid id", firstSeller.id.length > 0);
    TestValidator.predicate(
      "seller has valid approval_status",
      firstSeller.approval_status.length > 0,
    );
    TestValidator.predicate(
      "seller has valid shop_name",
      firstSeller.shop_name.length > 0,
    );
  }
  // Test 7: Test with date range filter combined with approval_status
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeResult: IPageIEcommerceSeller.ISummary =
    await api.functional.ecommerce.sellers.index(adminConnection, {
      body: {
        approval_status: "approved",
        created_at_gte: thirtyDaysAgo.toISOString(),
        created_at_lte: now.toISOString(),
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IEcommerceSeller.IRequest,
    });
  typia.assert(dateRangeResult);
  // Validate all returned sellers match approval status
  for (const seller of dateRangeResult.data) {
    TestValidator.equals(
      "date range filter - status matches",
      seller.approval_status,
      "approved",
    );
  }
}
