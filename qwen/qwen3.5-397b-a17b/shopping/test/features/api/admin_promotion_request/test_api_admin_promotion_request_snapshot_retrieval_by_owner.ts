import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminPromotionRequestSnapshot";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import type { IShoppingMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequestSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_shopping_mall_customer_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_customer_admin_promotion_requests_create";
import { prepare_random_shopping_mall_admin_promotion_request } from "../../../prepare/prepare_random_shopping_mall_admin_promotion_request";

/**
 * Test that a customer can retrieve the complete snapshot history of their own
 * administrator promotion request.
 *
 * This test validates:
 * 1. Customer account creation and admin promotion request submission
 * 2. Super administrator review and status update (pending → rejected)
 * 3. Snapshot retrieval by the request owner (customer)
 * 4. Snapshot content validation (actorType, status, reason, respondingSuperAdministrator, createdAt)
 * 5. Snapshot ordering (createdAt descending - newest first)
 * 6. Pagination metadata correctness
 */
export async function test_api_admin_promotion_request_snapshot_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account and get authenticated connection
  const customerConnection: api.IConnection = { host: connection.host };
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Submit administrator promotion request as customer
  const promotionRequest =
    await generate_random_shopping_mall_customer_admin_promotion_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // Verify initial status is pending
  TestValidator.equals(
    "initial status is pending",
    promotionRequest.status,
    "pending",
  );
  TestValidator.equals(
    "actor type is customer",
    promotionRequest.actor_type,
    "customer",
  );
  // 3. Create super administrator account and login
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: superAdminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // Login as super administrator to get fresh session
  const superAdminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_login(superAdminLoginConnection, {
    body: {
      email: superAdminAuth.email,
      password: superAdminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdministrator.ILogin,
  });
  // 4. Super administrator reviews and rejects the promotion request
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const updatedRequest =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.update(
      superAdminLoginConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IShoppingMallAdminPromotionRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // Verify request status was updated
  TestValidator.equals(
    "status updated to rejected",
    updatedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches",
    updatedRequest.rejection_reason,
    rejectionReason,
  );
  // 5. Customer retrieves snapshots of their promotion request
  const snapshotsResponse =
    await api.functional.shoppingMall.customer.admin_promotion_requests.snapshots.index(
      customerConnection,
      {
        requestId: promotionRequest.id,
        body: {
          page: 1,
          limit: 10,
          sort: "created_at",
          direction: "desc",
        } satisfies IShoppingMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    snapshotsResponse.pagination !== undefined,
  );
  TestValidator.equals(
    "current page is 1",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.equals("limit is 10", snapshotsResponse.pagination.limit, 10);
  TestValidator.predicate(
    "records count is positive",
    snapshotsResponse.pagination.records > 0,
  );
  TestValidator.predicate(
    "pages count is positive",
    snapshotsResponse.pagination.pages > 0,
  );
  TestValidator.equals(
    "records count matches data length",
    snapshotsResponse.pagination.records,
    snapshotsResponse.data.length,
  );
  // 7. Validate snapshots array exists and has expected count
  TestValidator.predicate(
    "snapshots data exists",
    Array.isArray(snapshotsResponse.data),
  );
  TestValidator.predicate(
    "at least 2 snapshots (pending + rejected)",
    snapshotsResponse.data.length >= 2,
  );
  // 8. Validate each snapshot structure
  for (let i = 0; i < snapshotsResponse.data.length; i++) {
    const snapshot = snapshotsResponse.data[i];
    // Validate actor type
    TestValidator.equals(
      `snapshot ${i} actor type is customer`,
      snapshot.actorType,
      "customer",
    );
    // Validate status is valid enum value
    TestValidator.predicate(
      `snapshot ${i} status is valid`,
      ["pending", "approved", "rejected"].includes(snapshot.status),
    );
    // Validate createdAt is valid ISO date-time
    TestValidator.predicate(
      `snapshot ${i} has valid createdAt`,
      !isNaN(Date.parse(snapshot.createdAt)),
    );
    // Validate pending snapshot specifics
    if (snapshot.status === "pending") {
      TestValidator.equals(
        `pending snapshot ${i} has null reason`,
        snapshot.reason,
        null,
      );
      TestValidator.equals(
        `pending snapshot ${i} has null responding super administrator`,
        snapshot.respondingSuperAdministrator,
        null,
      );
    }
    // Validate non-pending snapshot specifics
    if (snapshot.status !== "pending") {
      TestValidator.predicate(
        `rejected/approved snapshot ${i} has responding super administrator`,
        snapshot.respondingSuperAdministrator !== null,
      );
    }
    // Validate reason for rejected snapshots
    if (snapshot.status === "rejected") {
      TestValidator.predicate(
        `rejected snapshot ${i} has reason`,
        snapshot.reason !== null && snapshot.reason.length > 0,
      );
    }
  }
  // 9. Validate snapshots are sorted by createdAt descending (newest first)
  for (let i = 1; i < snapshotsResponse.data.length; i++) {
    const prevDate = new Date(
      snapshotsResponse.data[i - 1].createdAt,
    ).getTime();
    const currDate = new Date(snapshotsResponse.data[i].createdAt).getTime();
    TestValidator.predicate(
      `snapshot ${i} is older than or equal to snapshot ${i - 1}`,
      prevDate >= currDate,
    );
  }
  // 10. Verify first snapshot is the most recent (rejected status)
  TestValidator.equals(
    "first snapshot status is rejected",
    snapshotsResponse.data[0].status,
    "rejected",
  );
  // 11. Verify at least one snapshot has pending status (initial state)
  const hasPendingSnapshot = snapshotsResponse.data.some(
    (s) => s.status === "pending",
  );
  TestValidator.predicate("has pending snapshot", hasPendingSnapshot);
  // 12. Verify rejection reason in snapshot matches the reason provided
  const rejectedSnapshot = snapshotsResponse.data.find(
    (s) => s.status === "rejected",
  );
  TestValidator.predicate(
    "rejected snapshot exists",
    rejectedSnapshot !== undefined,
  );
  if (rejectedSnapshot !== undefined) {
    TestValidator.equals(
      "snapshot rejection reason matches",
      rejectedSnapshot.reason,
      rejectionReason,
    );
  }
}
