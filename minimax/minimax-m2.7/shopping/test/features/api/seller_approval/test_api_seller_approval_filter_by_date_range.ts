import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test filtering seller approvals by date range.
 *
 * Validates the admin endpoint for listing seller approval requests with date range filtering.
 * This test verifies that the created_at_from and created_at_to filters correctly narrow down
 * approval records based on their creation timestamp.
 *
 * The test covers:
 * 1. Admin authentication and seller registration with current timestamp
 * 2. Filtering with past date (yesterday) - should include the newly created approval
 * 3. Filtering with future date (tomorrow) - should return empty results
 * 4. Combined filtering with status='pending' and date range
 * 5. ISO 8601 date format validation in responses
 *
 * The date range filtering is essential for administrators to review approval requests
 * within specific time periods, such as finding all pending sellers from the last week.
 */
export async function test_api_seller_approval_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register a seller with current timestamp
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // Get current time for date range calculations
  const now = new Date();
  // Calculate yesterday's date (start of day)
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  // Calculate tomorrow's date (end of day)
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 59, 999);
  // 3. Query with past date filter - should include the newly created approval
  const pastRangeResult =
    await api.functional.ecommerceMall.admin.admin.seller_approvals.index(
      adminConnection,
      {
        body: {
          created_at_from: yesterday.toISOString() as string &
            tags.Format<"date-time">,
          status: "pending",
        } satisfies IEcommerceMallSellerApproval.IRequest,
      },
    );
  typia.assert(pastRangeResult);
  // Validate the newly created seller approval appears in results
  TestValidator.predicate(
    "new seller approval included in past date range",
    pastRangeResult.data.some(
      (approval) => approval.seller.email === seller.email,
    ),
  );
  // 4. Query with future date filter - should return empty (no records in future)
  const futureRangeResult =
    await api.functional.ecommerceMall.admin.admin.seller_approvals.index(
      adminConnection,
      {
        body: {
          created_at_from: tomorrow.toISOString() as string &
            tags.Format<"date-time">,
        } satisfies IEcommerceMallSellerApproval.IRequest,
      },
    );
  typia.assert(futureRangeResult);
  // Validate no records appear in future date range
  TestValidator.equals(
    "no records in future date range",
    futureRangeResult.data.length,
    0,
  );
  // 5. Test combined filters: status='pending' AND date range
  const combinedFilterResult =
    await api.functional.ecommerceMall.admin.admin.seller_approvals.index(
      adminConnection,
      {
        body: {
          status: "pending",
          created_at_from: yesterday.toISOString() as string &
            tags.Format<"date-time">,
          created_at_to: tomorrow.toISOString() as string &
            tags.Format<"date-time">,
        } satisfies IEcommerceMallSellerApproval.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  // Validate combined filter includes the new seller and all are pending
  TestValidator.predicate(
    "combined filter includes new seller approval",
    combinedFilterResult.data.some(
      (approval) => approval.seller.email === seller.email,
    ),
  );
  // Validate all returned approvals have pending status
  for (const approval of combinedFilterResult.data) {
    TestValidator.equals(
      "approval status is pending",
      approval.status,
      "pending",
    );
  }
  // 6. Validate ISO 8601 date format in responses
  const isoDateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  for (const approval of pastRangeResult.data) {
    TestValidator.predicate(
      "created_at is ISO 8601 format",
      isoDateTimeRegex.test(approval.created_at),
    );
    TestValidator.predicate(
      "updated_at is ISO 8601 format",
      isoDateTimeRegex.test(approval.updated_at),
    );
  }
}
