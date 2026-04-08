import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerSuspension";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test filtering of seller suspension records by specific seller ID.
 *
 * Validates that administrators can search and filter suspension records by seller identifier.
 * Verifies that the filtering mechanism correctly returns only suspension records matching the specified seller.
 *
 * **Test Flow:**
 * 1. Administrator registers an account with random credentials
 * 2. Queries existing suspension records to test filtering functionality
 * 3. Filters suspensions by specific seller ID
 * 4. Validates all returned records belong to the filtered seller
 * 5. Tests combined filtering with status (active/resolved)
 * 6. Validates pagination with seller filter
 * 7. Tests filtering by suspending administrator
 * 8. Validates total record count consistency
 *
 * This test ensures the seller suspension query API correctly supports filtering by seller
 * identity, allowing administrators to review suspension history for specific sellers.
 */
export async function test_api_seller_suspension_filter_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register an admin account using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Query all suspensions to get baseline data for testing filter
  const allSuspensions =
    await api.functional.ecommerceMall.admin.admin.seller_suspensions.index(
      adminConnection,
      {
        body: {
          limit: 100,
        } satisfies IEcommerceMallSellerSuspension.IRequest,
      },
    );
  typia.assert(allSuspensions);
  // 3. If no suspensions exist, test filter with non-existent seller
  if (allSuspensions.data.length === 0) {
    const emptyFiltered =
      await api.functional.ecommerceMall.admin.admin.seller_suspensions.index(
        adminConnection,
        {
          body: {
            sellerId: typia.random<string & tags.Format<"uuid">>(),
            limit: 10,
          } satisfies IEcommerceMallSellerSuspension.IRequest,
        },
      );
    typia.assert(emptyFiltered);
    // Validate empty result structure
    TestValidator.equals(
      "empty filtered result has data array",
      Array.isArray(emptyFiltered.data),
      true,
    );
    TestValidator.equals(
      "empty filtered result has pagination info",
      emptyFiltered.pagination !== undefined,
      true,
    );
    TestValidator.equals(
      "empty filtered result has zero records",
      emptyFiltered.pagination.records,
      0,
    );
    return;
  }
  // 4. Get seller and admin IDs from existing suspensions to test filtering
  const sampleSuspension = allSuspensions.data[0];
  const targetSellerId = sampleSuspension.seller.id;
  const targetAdminId = sampleSuspension.suspendedBy.id;
  // 5. Test filtering by sellerId
  const filteredBySeller =
    await api.functional.ecommerceMall.admin.admin.seller_suspensions.index(
      adminConnection,
      {
        body: {
          sellerId: targetSellerId,
        } satisfies IEcommerceMallSellerSuspension.IRequest,
      },
    );
  typia.assert(filteredBySeller);
  // 6. Validate all returned records belong to the target seller
  for (const suspension of filteredBySeller.data) {
    TestValidator.equals(
      "suspension belongs to target seller",
      suspension.seller.id,
      targetSellerId,
    );
  }
  // 7. Test combining sellerId filter with status filter 'active'
  const filteredActive =
    await api.functional.ecommerceMall.admin.admin.seller_suspensions.index(
      adminConnection,
      {
        body: {
          sellerId: targetSellerId,
          status: "active",
        } satisfies IEcommerceMallSellerSuspension.IRequest,
      },
    );
  typia.assert(filteredActive);
  // Verify active suspensions have no restored_at
  for (const suspension of filteredActive.data) {
    TestValidator.equals(
      "active suspension has no restored_at",
      suspension.restored_at,
      null,
    );
    TestValidator.equals(
      "active suspension belongs to target seller",
      suspension.seller.id,
      targetSellerId,
    );
  }
  // 8. Test filtering by status 'resolved'
  const filteredResolved =
    await api.functional.ecommerceMall.admin.admin.seller_suspensions.index(
      adminConnection,
      {
        body: {
          sellerId: targetSellerId,
          status: "resolved",
        } satisfies IEcommerceMallSellerSuspension.IRequest,
      },
    );
  typia.assert(filteredResolved);
  // Verify resolved suspensions have restored_at set
  for (const suspension of filteredResolved.data) {
    TestValidator.predicate(
      "resolved suspension has restored_at",
      suspension.restored_at !== null,
    );
    TestValidator.equals(
      "resolved suspension belongs to target seller",
      suspension.seller.id,
      targetSellerId,
    );
  }
  // 9. Test pagination with seller filter
  const paginatedFiltered =
    await api.functional.ecommerceMall.admin.admin.seller_suspensions.index(
      adminConnection,
      {
        body: {
          sellerId: targetSellerId,
          limit: 10,
          page: 1,
        } satisfies IEcommerceMallSellerSuspension.IRequest,
      },
    );
  typia.assert(paginatedFiltered);
  TestValidator.equals(
    "paginated result has correct limit",
    paginatedFiltered.pagination.limit,
    10,
  );
  TestValidator.equals(
    "paginated result page is 1",
    paginatedFiltered.pagination.current,
    1,
  );
  TestValidator.predicate(
    "all paginated results belong to target seller",
    paginatedFiltered.data.every((s) => s.seller.id === targetSellerId),
  );
  // 10. Test filtering by suspendedById (admin who performed suspension)
  const filteredByAdmin =
    await api.functional.ecommerceMall.admin.admin.seller_suspensions.index(
      adminConnection,
      {
        body: {
          suspendedById: targetAdminId,
        } satisfies IEcommerceMallSellerSuspension.IRequest,
      },
    );
  typia.assert(filteredByAdmin);
  // Validate all suspensions were made by the target admin
  for (const suspension of filteredByAdmin.data) {
    TestValidator.equals(
      "suspension made by target admin",
      suspension.suspendedBy.id,
      targetAdminId,
    );
  }
  // 11. Test combined filter: sellerId + suspendedById
  const filteredByBoth =
    await api.functional.ecommerceMall.admin.admin.seller_suspensions.index(
      adminConnection,
      {
        body: {
          sellerId: targetSellerId,
          suspendedById: targetAdminId,
        } satisfies IEcommerceMallSellerSuspension.IRequest,
      },
    );
  typia.assert(filteredByBoth);
  // Verify all results match both filters
  for (const suspension of filteredByBoth.data) {
    TestValidator.equals(
      "seller matches filter",
      suspension.seller.id,
      targetSellerId,
    );
    TestValidator.equals(
      "admin matches filter",
      suspension.suspendedBy.id,
      targetAdminId,
    );
  }
  // 12. Test pagination total count consistency
  // Get total count with just seller filter
  const fullList =
    await api.functional.ecommerceMall.admin.admin.seller_suspensions.index(
      adminConnection,
      {
        body: {
          sellerId: targetSellerId,
          limit: 100,
        } satisfies IEcommerceMallSellerSuspension.IRequest,
      },
    );
  typia.assert(fullList);
  // Validate total records is at least the number of filtered results
  TestValidator.predicate(
    "total records consistent",
    fullList.pagination.records >= filteredBySeller.data.length,
  );
}
