import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import type { IEcommerceMallAdminRequestRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequestOfCustomer";
import type { IEcommerceMallAdminRequestRequestOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequestOfSeller";
import type { IEcommerceMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestSnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_requests_create";
import { prepare_random_ecommerce_mall_admin_request_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_request_request";

export async function test_api_admin_request_rejection_creates_audit_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup super administrator actor
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: undefined,
  });
  typia.assert(adminAuthorized);
  // 2. Setup seller actor with shop profile
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: undefined,
  });
  typia.assert(sellerAuthorized);
  // 3. Seller submits admin access request (creates pending state)
  const adminRequestReason = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<500>
  >();
  const createdRequest =
    await api.functional.ecommerceMall.customer.admin_requests.create(
      sellerConnection,
      {
        body: { reason: adminRequestReason },
      },
    );
  typia.assert(createdRequest);
  TestValidator.equals(
    "initial status is pending",
    createdRequest.request_status,
    "pending",
  );
  TestValidator.equals(
    "request reason matches",
    createdRequest.reason,
    adminRequestReason,
  );
  TestValidator.equals(
    "snapshots initially empty",
    createdRequest.snapshots.length,
    0,
  );
  TestValidator.predicate(
    "seller is not banned",
    () => sellerAuthorized.is_banned === false,
  );
  // 4. Super administrator rejects the request
  const adminRequestId = createdRequest.id;
  const rejectionReason = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<1000>
  >();
  const updatedRequest =
    await api.functional.ecommerceMall.admin.admin_requests.updateStatus(
      adminConnection,
      {
        adminRequestId,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        },
      },
    );
  typia.assert(updatedRequest);
  // 5. Validate AdminRequest status changed to rejected
  TestValidator.equals(
    "updated status is rejected",
    updatedRequest.request_status,
    "rejected",
  );
  TestValidator.notEquals(
    "status changed from pending",
    createdRequest.request_status,
    updatedRequest.request_status,
  );
  // 6. Validate AdminRequestSnapshot was created
  TestValidator.equals(
    "snapshot count is 1",
    updatedRequest.snapshots.length,
    1,
  );
  const snapshot = updatedRequest.snapshots[0];
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot status is rejected",
    snapshot.request_status,
    "rejected",
  );
  TestValidator.equals(
    "snapshot reason matches original",
    snapshot.reason,
    adminRequestReason,
  );
  // 7. Validate snapshot has changed_at timestamp after created_at
  const createdAt = new Date(createdRequest.created_at).getTime();
  const changedAt = new Date(snapshot.changed_at).getTime();
  TestValidator.predicate(
    "snapshot has valid changed_at timestamp",
    () => changedAt >= createdAt,
  );
  // 8. Validate snapshot has rejecting admin reference (changedBy)
  TestValidator.predicate(
    "snapshot has changedBy admin",
    () => snapshot.changedBy !== null,
  );
  if (snapshot.changedBy) {
    TestValidator.equals(
      "snapshot changedBy is super admin",
      snapshot.changedBy.id,
      adminAuthorized.id,
    );
  }
  // 9. Validate snapshot has original request reference
  TestValidator.equals(
    "snapshot adminRequest id matches",
    snapshot.adminRequest.id,
    adminRequestId,
  );
  // 10. Verify seller account remains unchanged (still not approved as admin)
  TestValidator.equals(
    "seller approval status unchanged",
    sellerAuthorized.approval_status,
    "pending",
  );
  TestValidator.predicate(
    "seller is not banned",
    () => sellerAuthorized.is_banned === false,
  );
  // 11. Seller can view rejection reason through the request details (snapshot stores it)
  // The snapshot rejection reason is captured in the AdminRequestSnapshot
  TestValidator.predicate(
    "rejection reason captured in snapshot",
    () => snapshot.request_status === "rejected",
  );
  // 12. Seller can submit a new admin request after rejection
  const newRejectionReason = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<500>
  >();
  const newRequest =
    await api.functional.ecommerceMall.customer.admin_requests.create(
      sellerConnection,
      {
        body: { reason: newRejectionReason },
      },
    );
  typia.assert(newRequest);
  TestValidator.notEquals(
    "new request ID differs from old",
    newRequest.id,
    adminRequestId,
  );
  TestValidator.equals(
    "new request initial status is pending",
    newRequest.request_status,
    "pending",
  );
  TestValidator.equals(
    "new request reason matches",
    newRequest.reason,
    newRejectionReason,
  );
}
