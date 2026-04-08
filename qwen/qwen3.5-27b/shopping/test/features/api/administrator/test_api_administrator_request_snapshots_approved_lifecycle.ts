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
 * Test administrator promotion request snapshots lifecycle after approval.
 *
 * Validates that an administrator can view all snapshots of a promotion request that has been approved, showing the complete status transition history from pending to approved. Ensures snapshots are immutable, preserve the original request state, and are correctly ordered by creation timestamp.
 *
 * Special attention is given to verifying that the approved snapshot contains the administrator's ID who processed the request, and that all snapshots maintain the original reason text provided by the customer.
 *
 * 1. Customer registers and authenticates to the platform.
 * 2. Customer submits an administrator promotion request with a justification reason.
 * 3. Administrator registers and authenticates to the platform.
 * 4. Administrator approves the promotion request (creating snapshots).
 * 5. Administrator retrieves all snapshots for the approved request.
 * 6. Validates snapshots contain both 'pending' and 'approved' status transitions.
 * 7. Validates the approved snapshot has approved_by populated with administrator ID.
 * 8. Validates snapshots are sorted by created_at descending (newest first).
 * 9. Validates pagination metadata is included in the response.
 */
export async function test_api_administrator_request_snapshots_approved_lifecycle(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 2. Customer submits administrator promotion request
  const promotionRequest =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(promotionRequest);
  TestValidator.equals(
    "request initially pending",
    promotionRequest.status,
    "pending",
  );
  TestValidator.equals(
    "request actor type is customer",
    promotionRequest.actor_type,
    "customer",
  );
  TestValidator.predicate(
    "request has reason text",
    promotionRequest.reason.length > 0,
  );
  // 3. Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 4. Administrator approves the promotion request
  // Note: The actual approval endpoint is not provided in the available SDK functions.
  // The test assumes the promotion request has been approved through an external process
  // or the test environment simulates this state transition. In a production scenario,
  // there would be an endpoint like:
  // PATCH /shoppingMall/administrator/promotion-requests/{requestId}/approve
  // 5. Administrator retrieves snapshots for the promotion request
  const snapshotsResponse =
    await api.functional.shoppingMall.administrator.promotion_requests.snapshots.index(
      adminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(snapshotsResponse);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    snapshotsResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination has records",
    snapshotsResponse.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination has at least one page",
    snapshotsResponse.pagination.pages >= 1,
  );
  // 7. Validate snapshots array is not empty
  TestValidator.predicate(
    "snapshots array not empty",
    snapshotsResponse.data.length > 0,
  );
  // 8. Validate each snapshot structure
  await ArrayUtil.asyncForEach(snapshotsResponse.data, async (snapshot) => {
    typia.assert(snapshot);
    // Validate required fields exist
    TestValidator.predicate(
      `snapshot has id`,
      snapshot.id !== undefined && snapshot.id !== null,
    );
    TestValidator.equals(
      `snapshot user_type is customer`,
      snapshot.user_type,
      "customer",
    );
    TestValidator.equals(
      `snapshot reason matches original`,
      snapshot.reason,
      promotionRequest.reason,
    );
    TestValidator.predicate(
      `snapshot has status`,
      ["pending", "approved", "rejected"].includes(snapshot.status),
    );
    TestValidator.predicate(
      `snapshot has created_at`,
      snapshot.created_at !== undefined && snapshot.created_at !== null,
    );
  });
  // 9. Validate snapshots contain both pending and approved statuses
  const statuses = snapshotsResponse.data.map((s) => s.status);
  TestValidator.predicate(
    "snapshots contain pending status",
    statuses.includes("pending"),
  );
  TestValidator.predicate(
    "snapshots contain approved status",
    statuses.includes("approved"),
  );
  // 10. Find the approved snapshot and validate approved_by
  const approvedSnapshot = snapshotsResponse.data.find(
    (s) => s.status === "approved",
  );
  if (approvedSnapshot !== undefined && approvedSnapshot !== null) {
    typia.assertGuard(approvedSnapshot);
    TestValidator.predicate(
      "approved snapshot has approved_by",
      approvedSnapshot.approved_by !== null,
    );
    TestValidator.equals(
      "approved_by matches administrator ID",
      approvedSnapshot.approved_by,
      adminAuth.id,
    );
    TestValidator.equals(
      "approved snapshot response_reason is null",
      approvedSnapshot.response_reason,
      null,
    );
  }
  // 11. Validate snapshots are sorted by created_at descending (newest first)
  if (snapshotsResponse.data.length >= 2) {
    for (let i = 1; i < snapshotsResponse.data.length; i++) {
      const prev = snapshotsResponse.data[i - 1];
      const curr = snapshotsResponse.data[i];
      TestValidator.predicate(
        `snapshot ${i - 1} created_at >= snapshot ${i} created_at`,
        new Date(prev.created_at).getTime() >=
          new Date(curr.created_at).getTime(),
      );
    }
  }
  // 12. Validate snapshots preserve original reason across all entries
  const uniqueReasons = new Set(snapshotsResponse.data.map((s) => s.reason));
  TestValidator.equals("all snapshots have same reason", uniqueReasons.size, 1);
  TestValidator.equals(
    "reason matches original request",
    Array.from(uniqueReasons)[0],
    promotionRequest.reason,
  );
}
