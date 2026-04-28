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
 * Test filtering seller accounts by approval status with pagination verification.
 *
 * Validates that the PATCH /ecommercePlatform/sellers endpoint correctly filters seller accounts by approval status (pending, approved, rejected) and returns properly structured paginated results. Verifies that all returned seller summaries contain the expected approval status matching the filter criteria, and that pagination metadata accurately reflects the result set.
 *
 * Confirms that each seller summary includes the seller id, email, approvalStatus, rejectionReason, isBanned flag, creation timestamp, and associated shop profile information. Validates that the nested seller profile contains core identity fields like shop name, description, and logo.
 *
 * 1. Query sellers filtered by "pending" approval status with page 1 and limit 10.
 * 2. Validate the paginated response structure and seller summary fields.
 * 3. Verify all returned sellers have "pending" as their approvalStatus.
 * 4. Confirm pagination metadata is consistent (page, limit, records, pages).
 * 5. Verify results are sorted by created_at in descending order.
 * 6. Query sellers with "approved" status to confirm filtering isolation.
 * 7. Validate that "approved" results do not include any "pending" sellers.
 */
export async function test_api_seller_list_by_approval_status(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  // 1. Query sellers filtered by "pending" approval status
  const body = {
    approvalStatus: "pending",
    page: 1,
    limit: 10,
  } satisfies IEcommercePlatformSeller.IRequest;
  const pendingResponse = await api.functional.ecommercePlatform.sellers.index(
    adminConnection,
    { body },
  );
  typia.assert(pendingResponse);
  // 2. Validate pagination structure
  TestValidator.equals(
    "pending response has pagination object",
    pendingResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "pending pagination current page is 1",
    pendingResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pending pagination limit matches request",
    pendingResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pending pagination records is non-negative",
    () => pendingResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pending pagination pages is non-negative",
    () => pendingResponse.pagination.pages >= 0,
  );
  // 3. Validate each seller summary in the data array
  await ArrayUtil.asyncForEach(pendingResponse.data, async (seller) => {
    typia.assert(seller);
    // Verify approvalStatus matches filter
    TestValidator.equals(
      "seller has pending approval status",
      seller.approvalStatus,
      "pending",
    );
  });
  // 5. Verify results are sorted by created_at DESC (if multiple results)
  if (pendingResponse.data.length > 1) {
    const isSortedDesc = ArrayUtil.repeat(
      pendingResponse.data.length - 1,
      (i) => {
        const current = new Date(pendingResponse.data[i].createdAt).getTime();
        const next = new Date(pendingResponse.data[i + 1].createdAt).getTime();
        return current >= next;
      },
    ).every((sorted) => sorted);
    TestValidator.predicate(
      "pending sellers sorted by created_at descending",
      isSortedDesc,
    );
  }
  // 6. Query sellers with "approved" status
  const approvedBody = {
    approvalStatus: "approved",
    page: 1,
    limit: 10,
  } satisfies IEcommercePlatformSeller.IRequest;
  const approvedResponse = await api.functional.ecommercePlatform.sellers.index(
    adminConnection,
    { body: approvedBody },
  );
  typia.assert(approvedResponse);
  // Validate pagination for approved query
  TestValidator.equals(
    "approved response has pagination object",
    approvedResponse.pagination !== undefined,
    true,
  );
  // 7. Verify all "approved" results have correct status
  await ArrayUtil.asyncForEach(approvedResponse.data, async (seller) => {
    typia.assert(seller);
    TestValidator.equals(
      "seller has approved approval status",
      seller.approvalStatus,
      "approved",
    );
  });
  // 8. Validate that approved results do not contain any pending sellers
  if (approvedResponse.data.length > 0) {
    const hasNoPending = approvedResponse.data.every(
      (s) => s.approvalStatus === "approved",
    );
    TestValidator.predicate(
      "approved results contain no pending sellers",
      hasNoPending,
    );
  }
}
