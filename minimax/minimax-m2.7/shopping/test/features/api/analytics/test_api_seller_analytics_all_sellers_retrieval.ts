import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test retrieving comprehensive seller analytics without any filters.
 *
 * Validates the super admin seller analytics endpoint by authenticating as a super administrator and calling the sellers analytics endpoint with an empty request body. Verifies that the response includes proper pagination metadata, a data array containing seller records with all required fields (id, email, approvalStatus, suspensionStatus, shopName, productCount, orderCount, totalItemsSold, totalRevenue, createdAt), and that results are sorted by created_at descending by default.
 *
 * This test ensures the analytics aggregation is working correctly across all sellers in the system, including proper counting of products, orders, items sold, and revenue calculations.
 *
 * 1. Register and authenticate as superAdmin.
 * 2. Call the seller analytics endpoint with empty body (no filters).
 * 3. Validate response structure: pagination metadata and data array.
 * 4. Validate each seller record contains all required fields.
 * 5. Verify results are sorted by created_at descending.
 */
export async function test_api_seller_analytics_all_sellers_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(authorized);
  // 2. Call the seller analytics endpoint with empty body (no filters)
  const response =
    await api.functional.ecommerceMall.superAdmin.admin.analytics.sellers.index(
      superAdminConnection,
      {
        body: {} satisfies IEcommerceMallSeller.IAnalytic.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate response structure: pagination metadata
  TestValidator.equals("pagination exists", response.pagination !== null, true);
  TestValidator.equals("data array exists", Array.isArray(response.data), true);
  // 4. Validate pagination metadata
  const pagination = response.pagination;
  TestValidator.predicate("current page is valid", pagination.current >= 0);
  TestValidator.predicate("limit is valid", pagination.limit > 0);
  TestValidator.predicate("records count is valid", pagination.records >= 0);
  TestValidator.predicate("pages count is valid", pagination.pages >= 0);
  // Validate pages calculation
  if (pagination.records > 0) {
    TestValidator.equals(
      "pages calculation correct",
      pagination.pages,
      Math.ceil(pagination.records / pagination.limit),
    );
  }
  // 5. Validate each seller record contains all required fields
  for (const seller of response.data) {
    // Validate required string fields
    TestValidator.predicate(
      "seller has valid id (UUID)",
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        seller.id,
      ),
    );
    TestValidator.predicate(
      "seller has valid email",
      seller.email.includes("@"),
    );
    TestValidator.predicate(
      "seller has valid approvalStatus",
      ["pending", "approved", "rejected"].includes(seller.approvalStatus),
    );
    TestValidator.predicate(
      "seller has valid suspensionStatus",
      seller.suspensionStatus === null ||
        seller.suspensionStatus === "active" ||
        seller.suspensionStatus === "suspended",
    );
    TestValidator.predicate(
      "shopName is string or null",
      typeof seller.shopName === "string" || seller.shopName === null,
    );
    // Validate numeric fields
    TestValidator.predicate(
      "productCount is non-negative",
      seller.productCount >= 0,
    );
    TestValidator.predicate(
      "orderCount is non-negative",
      seller.orderCount >= 0,
    );
    TestValidator.predicate(
      "totalItemsSold is non-negative",
      seller.totalItemsSold >= 0,
    );
    TestValidator.predicate(
      "totalRevenue is non-negative",
      seller.totalRevenue >= 0,
    );
    // Validate timestamp
    TestValidator.predicate(
      "createdAt is valid ISO datetime",
      !isNaN(Date.parse(seller.createdAt)),
    );
    // Validate business logic: totalItemsSold and totalRevenue should be 0 for pending/rejected sellers
    if (
      seller.approvalStatus === "pending" ||
      seller.approvalStatus === "rejected"
    ) {
      TestValidator.equals(
        "pending/rejected seller has no items sold",
        seller.totalItemsSold,
        0,
      );
      TestValidator.equals(
        "pending/rejected seller has no revenue",
        seller.totalRevenue,
        0,
      );
    }
  }
  // 6. Verify results are sorted by created_at descending
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = new Date(response.data[i].createdAt).getTime();
      const next = new Date(response.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        `seller[${i}] created_at >= seller[${i + 1}] created_at`,
        current >= next,
      );
    }
  }
}
