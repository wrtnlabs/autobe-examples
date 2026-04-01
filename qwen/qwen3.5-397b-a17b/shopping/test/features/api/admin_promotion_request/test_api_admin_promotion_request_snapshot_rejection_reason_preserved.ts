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
 * Test that when a super administrator rejects an administrator promotion request,
 * the rejection reason is properly captured in the snapshot and can be retrieved by the customer.
 *
 * Test Steps:
 * 1. Register a new customer account using authorize_customer_join utility
 * 2. Submit an administrator promotion request with a justification reason
 * 3. Register a super administrator account
 * 4. Authenticate as super administrator
 * 5. Super administrator rejects the promotion request with a specific rejection reason
 * 6. Customer retrieves the list of snapshots to get the snapshot ID
 * 7. Customer retrieves the specific snapshot using the snapshot ID
 *
 * Validation Points:
 * - Verify snapshot.actorType equals 'customer'
 * - Verify snapshot.status equals 'rejected'
 * - Verify snapshot.respondingSuperAdministrator is not null
 * - Verify snapshot.reason contains the rejection reason
 * - Verify snapshot.createdAt is a valid timestamp
 * - Verify snapshot.request contains the original promotion request details
 */
export async function test_api_admin_promotion_request_snapshot_rejection_reason_preserved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Submit administrator promotion request
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
  // 3. Register super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 4. Define specific rejection reason to test preservation
  const rejectionReason =
    "Insufficient qualifications for administrator role. More experience required.";
  // 5. Super administrator rejects the promotion request
  const rejectResult =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.reject(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          reason: rejectionReason,
        } satisfies IShoppingMallAdminPromotionRequest.IReject,
      },
    );
  typia.assert(rejectResult);
  // Verify rejection was successful
  TestValidator.equals(
    "request status after rejection",
    rejectResult.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason preserved in request",
    rejectResult.rejection_reason,
    rejectionReason,
  );
  // 6. Customer retrieves the list of snapshots
  const snapshotList =
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
  typia.assert(snapshotList);
  // Verify snapshot list has at least one entry
  TestValidator.predicate(
    "snapshot list not empty",
    snapshotList.data.length > 0,
  );
  // Get the rejected snapshot (should be the most recent)
  const rejectedSnapshot = snapshotList.data.find(
    (s) => s.status === "rejected",
  );
  TestValidator.predicate(
    "rejected snapshot exists",
    rejectedSnapshot !== undefined,
  );
  if (rejectedSnapshot === undefined) {
    throw new Error("Rejected snapshot not found in snapshot list");
  }
  // 7. Customer retrieves the specific snapshot
  const snapshot =
    await api.functional.shoppingMall.customer.admin_promotion_requests.snapshots.at(
      customerConnection,
      {
        requestId: promotionRequest.id,
        snapshotId: rejectedSnapshot.id,
      },
    );
  typia.assert(snapshot);
  // Validation: Verify snapshot.actorType equals 'customer'
  TestValidator.equals("snapshot actor type", snapshot.actorType, "customer");
  // Validation: Verify snapshot.status equals 'rejected'
  TestValidator.equals("snapshot status", snapshot.status, "rejected");
  // Validation: Verify snapshot.respondingSuperAdministrator is not null
  TestValidator.predicate(
    "responding super administrator exists",
    snapshot.respondingSuperAdministrator !== null,
  );
  // Validation: Verify snapshot.reason contains the rejection reason
  TestValidator.equals(
    "rejection reason preserved in snapshot",
    snapshot.reason,
    rejectionReason,
  );
  // Validation: Verify snapshot.request contains the original promotion request details
  TestValidator.equals(
    "request ID matches",
    snapshot.request.id,
    promotionRequest.id,
  );
  TestValidator.equals(
    "request reason matches original",
    snapshot.request.reason,
    promotionRequest.reason,
  );
  TestValidator.equals(
    "request actor type matches",
    snapshot.request.actor_type,
    "customer",
  );
  // Validate responding super administrator details if present
  typia.assertGuard(snapshot.respondingSuperAdministrator!);
  TestValidator.equals(
    "super administrator email matches",
    snapshot.respondingSuperAdministrator.email,
    superAdminAuth.email,
  );
}
