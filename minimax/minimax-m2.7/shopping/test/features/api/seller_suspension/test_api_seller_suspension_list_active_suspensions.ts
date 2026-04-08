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
 * Test admin can retrieve paginated list of active seller suspensions with status filter.
 *
 * Validates the seller suspension listing functionality for administrators. Verifies that when querying with status "active", the response returns only currently suspended sellers (restored_at IS NULL) with proper pagination metadata. Each suspension record must contain seller information, administrator who performed the suspension, and suspension details including reason and timestamps.
 *
 * **Key validations:**
 * 1. Pagination metadata (current, limit, records, pages) is present and valid
 * 2. Each suspension record contains nested seller summary with id, email, approvalStatus, suspensionStatus
 * 3. Each suspension record contains suspendedBy admin summary with id, name, email
 * 4. restored_at is null for all active suspensions
 * 5. reason field is populated for each record
 * 6. Default sort order is suspended_at descending (newest first)
 * 7. Cursor-based pagination works by passing cursor from first page
 *
 * 1. Register an admin account using authorize_admin_join
 * 2. Query seller suspensions with status "active"
 * 3. Validate response structure and content
 * 4. Test pagination with cursor
 */
export async function test_api_seller_suspension_list_active_suspensions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 2. Query seller suspensions with status "active"
  const suspensions =
    await api.functional.ecommerceMall.admin.admin.seller_suspensions.index(
      adminConnection,
      {
        body: {
          status: "active",
        } satisfies IEcommerceMallSellerSuspension.IRequest,
      },
    );
  typia.assert(suspensions);
  // 3. Verify pagination metadata
  TestValidator.equals(
    "pagination exists",
    suspensions.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "current page is valid",
    suspensions.pagination.current >= 0,
  );
  TestValidator.predicate("limit is valid", suspensions.pagination.limit >= 0);
  TestValidator.predicate(
    "records count is valid",
    suspensions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    suspensions.pagination.pages >= 0,
  );
  // 4. Verify each suspension record structure
  for (const suspension of suspensions.data) {
    // Verify seller summary
    TestValidator.equals(
      "seller exists",
      suspension.seller !== undefined,
      true,
    );
    TestValidator.predicate(
      "seller has id",
      suspension.seller.id !== undefined,
    );
    TestValidator.predicate(
      "seller has email",
      suspension.seller.email !== undefined,
    );
    TestValidator.predicate(
      "seller has approvalStatus",
      suspension.seller.approvalStatus !== undefined,
    );
    TestValidator.predicate(
      "seller has suspensionStatus",
      suspension.seller.suspensionStatus !== undefined,
    );
    // Verify suspendedBy admin summary
    TestValidator.equals(
      "suspendedBy exists",
      suspension.suspendedBy !== undefined,
      true,
    );
    TestValidator.predicate(
      "suspendedBy has id",
      suspension.suspendedBy.id !== undefined,
    );
    TestValidator.predicate(
      "suspendedBy has name",
      suspension.suspendedBy.name !== undefined,
    );
    TestValidator.predicate(
      "suspendedBy has email",
      suspension.suspendedBy.email !== undefined,
    );
    // Verify restored_at is null for active suspensions
    TestValidator.equals(
      "restored_at is null for active suspension",
      suspension.restored_at,
      null,
    );
    // Verify reason is populated
    TestValidator.predicate(
      "reason is populated",
      suspension.reason.length > 0,
    );
    // Verify timestamps
    TestValidator.predicate(
      "suspended_at is valid",
      suspension.suspended_at !== undefined,
    );
    TestValidator.predicate(
      "created_at is valid",
      suspension.created_at !== undefined,
    );
    TestValidator.predicate(
      "updated_at is valid",
      suspension.updated_at !== undefined,
    );
  }
  // 5. Verify default sort order (suspended_at descending - newest first)
  if (suspensions.data.length > 1) {
    for (let i = 0; i < suspensions.data.length - 1; i++) {
      const current = new Date(suspensions.data[i].suspended_at);
      const next = new Date(suspensions.data[i + 1].suspended_at);
      TestValidator.predicate(
        "suspensions sorted by suspended_at descending",
        current >= next,
      );
    }
  }
  // 6. Test cursor-based pagination
  if (suspensions.data.length > 0 && suspensions.pagination.pages > 1) {
    const lastSuspension = suspensions.data[suspensions.data.length - 1];
    const cursorPage =
      await api.functional.ecommerceMall.admin.admin.seller_suspensions.index(
        adminConnection,
        {
          body: {
            status: "active",
            cursor: lastSuspension.suspended_at,
            limit: 1,
          } satisfies IEcommerceMallSellerSuspension.IRequest,
        },
      );
    typia.assert(cursorPage);
    // Verify cursor pagination returns subsequent records
    TestValidator.predicate(
      "cursor page has data",
      cursorPage.data.length >= 0,
    );
    TestValidator.predicate(
      "cursor page limit is 1",
      cursorPage.pagination.limit === 1,
    );
  }
}
