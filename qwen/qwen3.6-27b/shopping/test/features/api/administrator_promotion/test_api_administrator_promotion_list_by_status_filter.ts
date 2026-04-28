import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformAdministratorPromotionRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdministratorPromotionRequestOfCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformAdministratorPromotionRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformAdministratorPromotionRequestOfCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator promotion request list filtering by lifecycle status.
 *
 * Validates that an authenticated administrator can query promotion requests filtered by their lifecycle status. Ensures that when filtering by pending, approved, or rejected status, only records with the corresponding status are returned.
 *
 * Each filtered result is verified to contain promotion request summaries with expected fields including request ID, actor type, status, reason, rejection details, and review metadata.
 *
 * Pagination metadata is validated to ensure current page number, limit, total records, and total pages are present and correctly computed by the query endpoint.
 *
 * 1. Administrator registers and authenticates via join endpoint.
 * 2. Query promotion requests with status='pending' filter.
 * 3. Validate all returned summaries have status='pending'.
 * 4. Query promotion requests with status='approved' filter.
 * 5. Validate all returned summaries have status='approved'.
 * 6. Query promotion requests with status='rejected' filter.
 * 7. Validate all returned summaries have status='rejected'.
 * 8. Validate pagination metadata structure and values.
 */
export async function test_api_administrator_promotion_list_by_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate admin for access to promotion requests
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, { body: {} });
  typia.assert(adminAuth);
  // 2-3. Filter by status='pending' and validate all records match
  const pendingFilterBody = {
    status: "pending",
  } satisfies IEcommercePlatformAdministratorPromotionRequestOfCustomer.IRequest;
  const pendingResponse =
    await api.functional.ecommercePlatform.admin.administrator_promotion_requests.index(
      adminConnection,
      { body: pendingFilterBody },
    );
  typia.assert(pendingResponse);
  for (const record of pendingResponse.data) {
    typia.assert(record);
    TestValidator.equals(
      "pending filter returns only pending status records",
      record.status,
      "pending",
    );
  }
  // 4-5. Filter by status='approved' and validate all records match
  const approvedFilterBody = {
    status: "approved",
  } satisfies IEcommercePlatformAdministratorPromotionRequestOfCustomer.IRequest;
  const approvedResponse =
    await api.functional.ecommercePlatform.admin.administrator_promotion_requests.index(
      adminConnection,
      { body: approvedFilterBody },
    );
  typia.assert(approvedResponse);
  for (const record of approvedResponse.data) {
    typia.assert(record);
    TestValidator.equals(
      "approved filter returns only approved status records",
      record.status,
      "approved",
    );
  }
  // 6-7. Filter by status='rejected' and validate all records match
  const rejectedFilterBody = {
    status: "rejected",
  } satisfies IEcommercePlatformAdministratorPromotionRequestOfCustomer.IRequest;
  const rejectedResponse =
    await api.functional.ecommercePlatform.admin.administrator_promotion_requests.index(
      adminConnection,
      { body: rejectedFilterBody },
    );
  typia.assert(rejectedResponse);
  for (const record of rejectedResponse.data) {
    typia.assert(record);
    TestValidator.equals(
      "rejected filter returns only rejected status records",
      record.status,
      "rejected",
    );
  }
  // 8. Validate pagination metadata structure and values
  const pagination = pendingResponse.pagination;
  TestValidator.predicate(
    "pagination current is positive",
    pagination.current > 0,
  );
  TestValidator.predicate("pagination limit is positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );
}
