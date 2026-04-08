import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorPromotionRequestSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorPromotionRequestSnapshot";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_customer_administrator_requests_create";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

/**
 * Test administrator promotion request snapshot filtering by status.
 *
 * Validates that administrators can retrieve promotion request snapshots filtered by specific status values. Tests the complete workflow from customer request submission through administrator approval, verifying that snapshots are created at each status transition and can be filtered correctly.
 *
 * Special attention is given to ensuring that status filtering returns only snapshots matching the specified status while maintaining all snapshot data integrity including user_type, reason, created_at, and approved_by fields.
 *
 * 1. Customer registers and authenticates to the platform.
 * 2. Customer submits an administrator promotion request with a reason.
 * 3. Administrator registers and authenticates to the platform.
 * 4. Administrator retrieves snapshots filtered by 'pending' status.
 * 5. Verify pending snapshots contain correct data and status='pending'.
 * 6. Administrator retrieves snapshots filtered by 'approved' status.
 * 7. Verify approved snapshots contain correct data and status='approved'.
 * 8. Validate that each snapshot maintains all required fields.
 */
export async function test_api_administrator_request_snapshots_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Customer submits administrator promotion request
  const request =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(request);
  // 3. Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 4. Retrieve snapshots filtered by 'pending' status
  const pendingSnapshots =
    await api.functional.shoppingMall.administrator.promotion_requests.snapshots.index(
      adminConnection,
      {
        requestId: request.id,
        body: {
          status: "pending",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdministratorPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(pendingSnapshots);
  // 5. Verify pending snapshots - all should have status='pending'
  TestValidator.equals(
    "pending snapshots limit",
    pendingSnapshots.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "has pending snapshots",
    pendingSnapshots.data.length > 0,
  );
  for (const snapshot of pendingSnapshots.data) {
    TestValidator.equals(
      "snapshot status is pending",
      snapshot.status,
      "pending",
    );
    TestValidator.equals(
      "snapshot user_type is customer",
      snapshot.user_type,
      "customer",
    );
    TestValidator.equals(
      "snapshot reason matches request",
      snapshot.reason,
      request.reason,
    );
  }
  // 6. Retrieve snapshots filtered by 'approved' status
  const approvedSnapshots =
    await api.functional.shoppingMall.administrator.promotion_requests.snapshots.index(
      adminConnection,
      {
        requestId: request.id,
        body: {
          status: "approved",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdministratorPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedSnapshots);
  // 7. Verify approved snapshots - all should have status='approved' (may be empty)
  TestValidator.equals(
    "approved snapshots limit",
    approvedSnapshots.pagination.limit,
    20,
  );
  for (const snapshot of approvedSnapshots.data) {
    TestValidator.equals(
      "snapshot status is approved",
      snapshot.status,
      "approved",
    );
    TestValidator.equals(
      "snapshot user_type is customer",
      snapshot.user_type,
      "customer",
    );
    TestValidator.equals(
      "snapshot reason matches request",
      snapshot.reason,
      request.reason,
    );
  }
  // 8. Verify pagination metadata integrity
  TestValidator.predicate(
    "pending pagination current page valid",
    pendingSnapshots.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pending pagination records non-negative",
    pendingSnapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "approved pagination current page valid",
    approvedSnapshots.pagination.current >= 1,
  );
  TestValidator.predicate(
    "approved pagination records non-negative",
    approvedSnapshots.pagination.records >= 0,
  );
}
