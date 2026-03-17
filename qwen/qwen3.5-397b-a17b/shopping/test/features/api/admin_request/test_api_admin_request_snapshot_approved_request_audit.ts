import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminRequestSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRequest";
import type { IShoppingMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRequestSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_shopping_mall_customer_admin_requests_create } from "../../../generate/generate_random_shopping_mall_customer_admin_requests_create";
import { prepare_random_shopping_mall_admin_request } from "../../../prepare/prepare_random_shopping_mall_admin_request";

/**
 * Test the complete audit trail retrieval for an approved administrator promotion request.
 *
 * This test validates the snapshot functionality for admin promotion requests:
 * 1. Customer submits an admin promotion request with a valid reason
 * 2. Super administrator approves the request
 * 3. Admin retrieves snapshots to verify the complete audit trail
 *
 * Validates:
 * - Snapshots show chronological progression from PENDING to APPROVED status
 * - The approved snapshot includes responder information (super admin who approved)
 * - responded_at timestamp is populated for the APPROVED snapshot
 * - requested_at timestamp is preserved from original submission
 * - Pagination returns correct metadata with total records count
 * - Snapshots are immutable historical records showing the complete lifecycle
 */
export async function test_api_admin_request_snapshot_approved_request_audit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate customer who will submit the admin request
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);
  // 2. Create and authenticate super administrator who will approve the request
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoin = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminJoin);
  // 3. Create and authenticate admin who will retrieve snapshots
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // 4. Customer submits admin promotion request with valid reason
  const reasonText = RandomGenerator.paragraph({ sentences: 3 });
  const adminRequest =
    await api.functional.shoppingMall.customer.admin_requests.create(
      customerConnection,
      {
        body: {
          reason: reasonText,
        } satisfies IShoppingMallAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  // Validate initial request state
  TestValidator.equals(
    "request status is PENDING",
    adminRequest.status,
    "PENDING",
  );
  TestValidator.equals(
    "request reason matches",
    adminRequest.reason,
    reasonText,
  );
  TestValidator.equals(
    "customer matches",
    adminRequest.customer.id,
    customerJoin.id,
  );
  TestValidator.predicate(
    "requested_at is set",
    adminRequest.requested_at !== null,
  );
  TestValidator.predicate(
    "responded_at is null for pending",
    adminRequest.responded_at === null,
  );
  TestValidator.predicate(
    "responder is null for pending",
    adminRequest.respondedBySuperAdmin === null,
  );
  // 5. Super administrator approves the pending admin request
  const approvedRequest =
    await api.functional.shoppingMall.superAdmin.admin_requests.approve(
      superAdminConnection,
      {
        requestId: adminRequest.id,
      },
    );
  typia.assert(approvedRequest);
  // Validate approved request state
  TestValidator.equals(
    "request status is APPROVED",
    approvedRequest.status,
    "APPROVED",
  );
  TestValidator.predicate(
    "responded_at is populated",
    approvedRequest.responded_at !== null,
  );
  TestValidator.predicate(
    "responder is set",
    approvedRequest.respondedBySuperAdmin !== null,
  );
  TestValidator.equals(
    "responder is super admin",
    approvedRequest.respondedBySuperAdmin!.id,
    superAdminJoin.id,
  );
  TestValidator.equals(
    "requested_at preserved",
    approvedRequest.requested_at,
    adminRequest.requested_at,
  );
  // 6. Admin retrieves snapshots to verify audit trail
  const snapshotsResponse =
    await api.functional.shoppingMall.admin.adminRequests.snapshots.index(
      adminConnection,
      {
        adminRequestId: adminRequest.id,
        body: {
          page: 1,
          limit: 20,
          sort: "created_at,desc",
        } satisfies IShoppingMallAdminRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.equals("limit is 20", snapshotsResponse.pagination.limit, 20);
  TestValidator.predicate(
    "has records",
    snapshotsResponse.pagination.records > 0,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    snapshotsResponse.pagination.pages > 0,
  );
  // Validate we have at least 2 snapshots (PENDING and APPROVED states)
  TestValidator.predicate(
    "has at least 2 snapshots for audit trail",
    snapshotsResponse.data.length >= 2,
  );
  // Find the APPROVED snapshot (should exist after approval)
  const approvedSnapshot = snapshotsResponse.data.find(
    (s) => s.status === "APPROVED",
  );
  TestValidator.predicate(
    "APPROVED snapshot exists",
    approvedSnapshot !== undefined,
  );
  // Validate APPROVED snapshot details
  if (approvedSnapshot) {
    TestValidator.equals(
      "snapshot status is APPROVED",
      approvedSnapshot.status,
      "APPROVED",
    );
    TestValidator.predicate(
      "snapshot responded_at is populated",
      approvedSnapshot.responded_at !== null,
    );
    TestValidator.predicate(
      "snapshot responder is set",
      approvedSnapshot.responder !== null,
    );
    TestValidator.equals(
      "snapshot responder is super admin",
      approvedSnapshot.responder!.id,
      superAdminJoin.id,
    );
    TestValidator.equals(
      "snapshot requested_at matches original",
      approvedSnapshot.requested_at,
      adminRequest.requested_at,
    );
  }
  // Validate chronological order (newest first due to sort: created_at,desc)
  for (let i = 0; i < snapshotsResponse.data.length - 1; i++) {
    const current = snapshotsResponse.data[i];
    const next = snapshotsResponse.data[i + 1];
    TestValidator.predicate(
      `snapshot ${i} is newer than or equal to snapshot ${i + 1}`,
      new Date(current.created_at).getTime() >=
        new Date(next.created_at).getTime(),
    );
  }
  // Validate snapshot integrity: all snapshots preserve the original requested_at
  for (const snapshot of snapshotsResponse.data) {
    TestValidator.equals(
      "snapshot preserves original requested_at",
      snapshot.requested_at,
      adminRequest.requested_at,
    );
  }
}
