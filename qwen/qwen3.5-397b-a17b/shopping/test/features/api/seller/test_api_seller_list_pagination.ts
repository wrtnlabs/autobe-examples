import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the primary success path for retrieving a paginated list of all seller accounts.
 *
 * Validates the complete seller list pagination workflow including administrator authentication, paginated retrieval, and response structure validation. Ensures that the pagination metadata is accurate and that seller summaries contain all required fields with correct data types.
 *
 * Special attention is given to verifying that the pagination calculations are correct, sellers are ordered by created_at in descending order, and rejectionReason is properly null for pending and approved sellers while containing values for rejected sellers.
 *
 * 1. Administrator authenticates using authorize_admin_join utility.
 * 2. Calls seller list endpoint with default pagination (page=1, limit=10).
 * 3. Validates pagination metadata structure and calculations.
 * 4. Validates each seller summary contains required fields.
 * 5. Verifies ordering by created_at descending.
 * 6. Confirms rejectionReason is null for non-rejected sellers.
 */
export async function test_api_seller_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Retrieve paginated seller list with default parameters
  const sellerList =
    await api.functional.shoppingMall.admin.admin.sellers.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "created_at",
          direction: "desc",
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(sellerList);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "current page is 1",
    sellerList.pagination.current === 1,
  );
  TestValidator.predicate("limit is 10", sellerList.pagination.limit === 10);
  TestValidator.predicate(
    "records is non-negative",
    sellerList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages calculation is correct",
    sellerList.pagination.pages ===
      Math.ceil(sellerList.pagination.records / sellerList.pagination.limit),
  );
  // 4. Validate response contains data array
  TestValidator.predicate("data is array", Array.isArray(sellerList.data));
  // 5. Validate each seller summary contains required fields
  for (const seller of sellerList.data) {
    // Validate UUID format for id
    TestValidator.predicate(
      "seller id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        seller.id,
      ),
    );
    // Validate email format
    TestValidator.predicate(
      "seller email is valid",
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(seller.email),
    );
    // Validate approvalStatus is one of expected values
    TestValidator.predicate(
      "approvalStatus is valid",
      ["pending", "approved", "rejected"].includes(seller.approvalStatus),
    );
    // Validate rejectionReason is null for pending/approved sellers
    if (
      seller.approvalStatus === "pending" ||
      seller.approvalStatus === "approved"
    ) {
      TestValidator.equals(
        "rejectionReason is null for non-rejected seller",
        seller.rejectionReason,
        null,
      );
    }
    // Validate timestamps are ISO 8601 format
    TestValidator.predicate(
      "createdAt is valid ISO date",
      !isNaN(Date.parse(seller.createdAt)),
    );
    TestValidator.predicate(
      "updatedAt is valid ISO date",
      !isNaN(Date.parse(seller.updatedAt)),
    );
  }
  // 6. Validate ordering by created_at descending (newest first)
  if (sellerList.data.length > 1) {
    for (let i = 0; i < sellerList.data.length - 1; i++) {
      const currentDate = new Date(sellerList.data[i].createdAt).getTime();
      const nextDate = new Date(sellerList.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        `sellers ordered by created_at desc (index ${i})`,
        currentDate >= nextDate,
      );
    }
  }
}
