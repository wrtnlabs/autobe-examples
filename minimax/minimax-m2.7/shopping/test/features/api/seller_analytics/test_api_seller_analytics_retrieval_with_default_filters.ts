import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test retrieving all seller analytics with default filters.
 *
 * Validates that an authenticated administrator can retrieve a comprehensive
 * paginated list of all sellers with their aggregate metrics. The endpoint
 * returns seller information including approval status, suspension status,
 * shop name, product counts, order statistics, revenue data, and timestamps.
 * Default filters return all sellers sorted by creation date (newest first).
 *
 * This test validates:
 * - Successful authentication with admin credentials
 * - Default filter behavior (no filters applied returns all data)
 * - Pagination metadata structure and values (current, limit, records, pages)
 * - Seller summary data structure with all required aggregate metrics
 *
 * 1. Admin authenticates using admin join endpoint.
 * 2. Admin calls seller analytics endpoint with empty body (all default filters).
 * 3. System returns paginated response with seller analytics.
 * 4. Validates pagination metadata structure and non-negative integer values.
 * 5. Validates each seller record contains all required aggregate metric fields.
 */
export async function test_api_seller_analytics_retrieval_with_default_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Call seller analytics endpoint with empty body (default filters)
  const response: IPageIEcommerceMallSeller.IAnalytic.ISummary =
    await api.functional.ecommerceMall.admin.admin.analytics.sellers.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallSeller.IAnalytic.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata structure
  const pagination: IPage.IPagination = response.pagination;
  TestValidator.equals(
    "pagination current is valid",
    pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "pagination limit is valid",
    pagination.limit >= 0,
    true,
  );
  TestValidator.equals(
    "pagination records is valid",
    pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages is valid",
    pagination.pages >= 0,
    true,
  );
  // 4. Validate data array exists and is an array
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  // 5. Validate each seller record structure when data exists
  for (const seller of response.data) {
    // Validate required fields exist
    TestValidator.predicate(
      "seller has valid id",
      typeof seller.id === "string" && seller.id.length > 0,
    );
    TestValidator.predicate(
      "seller has valid email",
      typeof seller.email === "string" && seller.email.includes("@"),
    );
    TestValidator.equals(
      "seller has valid approvalStatus",
      ["pending", "approved", "rejected"].includes(seller.approvalStatus),
      true,
    );
    TestValidator.equals(
      "seller has valid suspensionStatus",
      seller.suspensionStatus === null ||
        seller.suspensionStatus === "active" ||
        seller.suspensionStatus === "suspended",
      true,
    );
    TestValidator.equals(
      "seller has valid productCount",
      typeof seller.productCount === "number" && seller.productCount >= 0,
      true,
    );
    TestValidator.equals(
      "seller has valid orderCount",
      typeof seller.orderCount === "number" && seller.orderCount >= 0,
      true,
    );
    TestValidator.equals(
      "seller has valid totalItemsSold",
      typeof seller.totalItemsSold === "number" && seller.totalItemsSold >= 0,
      true,
    );
    TestValidator.equals(
      "seller has valid totalRevenue",
      typeof seller.totalRevenue === "number" && seller.totalRevenue >= 0,
      true,
    );
    TestValidator.predicate(
      "seller has valid createdAt",
      typeof seller.createdAt === "string" && seller.createdAt.length > 0,
    );
  }
}
