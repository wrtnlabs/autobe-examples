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
 * Test retrieving resolved (historical) seller suspension records for administrative oversight.
 *
 * Validates that administrators can successfully query historical suspension records
 * for sellers who have been restored. This endpoint is critical for audit trails and
 * compliance purposes, ensuring administrators can review past suspension activities.
 *
 * The test verifies:
 * - Pagination metadata is correctly returned
 * - Each resolved suspension has restored_at timestamp (NOT null)
 * - restoredBy admin summary contains required fields (id, name, email)
 * - Date range filtering works correctly for restoration dates
 * - Only resolved suspensions are returned when filtering by status "resolved"
 *
 * 1. Admin authentication via authorize_admin_join
 * 2. Query resolved suspensions with status filter
 * 3. Validate pagination structure (current, limit, records, pages)
 * 4. Verify all returned records have restored_at populated
 * 5. Validate restoredBy admin details are present
 * 6. Test date range filtering for restoration timestamps
 */
export async function test_api_seller_suspension_list_resolved_suspensions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: "https://admin.example.com/seller-suspensions",
      referrer: "https://admin.example.com/dashboard",
    },
  });
  // 2. Query resolved suspensions with status filter
  const resolvedSuspensions =
    await api.functional.ecommerceMall.admin.admin.seller_suspensions.index(
      adminConnection,
      {
        body: {
          status: "resolved",
        } satisfies IEcommerceMallSellerSuspension.IRequest,
      },
    );
  typia.assert(resolvedSuspensions);
  // 3. Validate pagination metadata structure
  TestValidator.equals(
    "pagination current page is valid",
    resolvedSuspensions.pagination.current,
    resolvedSuspensions.pagination.current,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    resolvedSuspensions.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    resolvedSuspensions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    resolvedSuspensions.pagination.pages >= 0,
  );
  // 4. Validate each suspension record has required fields
  for (const suspension of resolvedSuspensions.data) {
    // Verify restored_at is NOT null for resolved suspensions
    TestValidator.predicate(
      "restored_at is not null for resolved suspension",
      suspension.restored_at !== null && suspension.restored_at !== undefined,
    );
    // Verify restoredBy admin summary is present
    TestValidator.predicate(
      "restoredBy admin summary is present",
      suspension.restoredBy !== null && suspension.restoredBy !== undefined,
    );
    // Validate restoredBy admin has required fields
    if (suspension.restoredBy) {
      TestValidator.predicate(
        "restoredBy admin has valid UUID",
        /^[0-9a-f-]{36}$/i.test(suspension.restoredBy.id),
      );
      TestValidator.predicate(
        "restoredBy admin has non-empty name",
        suspension.restoredBy.name.length > 0,
      );
      TestValidator.predicate(
        "restoredBy admin has valid email",
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(suspension.restoredBy.email),
      );
    }
    // Verify seller summary is present
    TestValidator.predicate(
      "seller summary is present",
      suspension.seller !== undefined && suspension.seller !== null,
    );
    // Verify suspendedBy admin summary is present
    TestValidator.predicate(
      "suspendedBy admin summary is present",
      suspension.suspendedBy !== undefined && suspension.suspendedBy !== null,
    );
    // Verify suspension reason is present
    TestValidator.predicate(
      "suspension reason is non-empty",
      suspension.reason.length > 0,
    );
  }
  // 5. Test date range filtering for restoration dates
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const filteredSuspensions =
    await api.functional.ecommerceMall.admin.admin.seller_suspensions.index(
      adminConnection,
      {
        body: {
          status: "resolved",
          restoredAtFrom: thirtyDaysAgo.toISOString() as string &
            tags.Format<"date-time">,
        } satisfies IEcommerceMallSellerSuspension.IRequest,
      },
    );
  typia.assert(filteredSuspensions);
  // Validate all returned records have restoration date within range
  for (const suspension of filteredSuspensions.data) {
    if (suspension.restored_at) {
      const restoredAt = new Date(suspension.restored_at);
      TestValidator.predicate(
        "restored_at is within specified date range",
        restoredAt >= thirtyDaysAgo && restoredAt <= now,
      );
    }
  }
  // 6. Test pagination with limit parameter
  const paginatedResult =
    await api.functional.ecommerceMall.admin.admin.seller_suspensions.index(
      adminConnection,
      {
        body: {
          status: "resolved",
          limit: 5 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceMallSellerSuspension.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "limit respects requested page size",
    paginatedResult.pagination.limit <= 5,
  );
  TestValidator.predicate(
    "returned data count does not exceed limit",
    paginatedResult.data.length <= 5,
  );
}
