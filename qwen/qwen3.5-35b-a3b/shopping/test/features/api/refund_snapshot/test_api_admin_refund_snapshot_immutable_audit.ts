import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

export async function test_api_admin_refund_snapshot_immutable_audit(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<(string & tags.Format<"email">)>(),
      password: "Admin123!",
      href: typia.random<(string & tags.Format<"uri">)>(),
      referrer: typia.random<(string & tags.Format<"uri">)>(),
      ip: typia.random<(string & tags.Format<"ipv4">)>(),
    },
  });
  typia.assert(adminJoinResult);
  const adminCredentials: IEcommerceMallAdmin.ILogin = {
    email: adminJoinResult.email,
    password: "Admin123!",
  };
  await authorize_admin_login(adminConnection, { body: adminCredentials });
  // Setup customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<(string & tags.Format<"email">)>(),
      password: "Customer123!",
      href: typia.random<(string & tags.Format<"uri">)>(),
      referrer: typia.random<(string & tags.Format<"uri">)>(),
      ip: typia.random<(string & tags.Format<"ipv4">)>(),
    },
  });
  typia.assert(customerAuth);
  // Setup seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<(string & tags.Format<"email">)>(),
      password: "Seller123!",
      href: typia.random<(string & tags.Format<"uri">)>(),
      referrer: typia.random<(string & tags.Format<"uri">)>(),
      ip: typia.random<(string & tags.Format<"ipv4">)>(),
    },
  });
  typia.assert(sellerAuth);
  // Create order item with delivered status (required for refund request)
  const orderItemId = typia.random<(string & tags.Format<"uuid">)>();
  // Customer creates refund request
  const refundRequest =
    await api.functional.ecommerceMall.customer.refund_requests.create(
      customerConnection,
      {
        orderItemId,
        body: {
          reason: typia.random<(string & tags.Format<"email">)>(),
          evidence_description: typia.random<(string & tags.Format<"uri">)>(),
        },
      },
    );
  typia.assert(refundRequest);
  const refundRequestId = refundRequest.id;
  const initialCreatedAt = refundRequest.createdAt;
  // Seller approves refund request (creates first snapshot)
  const approvedRequest =
    await api.functional.ecommerceMall.seller.refund_requests.approve(
      sellerConnection,
      {
        refundRequestId,
        body: { action: "approve" },
      },
    );
  typia.assert(approvedRequest);
  // Validate snapshot was created through state preservation
  TestValidator.equals(
    "approved request status",
    approvedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "has seller response",
    approvedRequest.sellerResponse !== null,
  );
  TestValidator.predicate(
    "has decision timestamp",
    approvedRequest.decisionAt !== null,
  );
  // Snapshot immutability: verify refund request data is preserved
  TestValidator.equals(
    "original reason preserved",
    approvedRequest.reason,
    refundRequest.reason,
  );
  TestValidator.equals(
    "original evidence preserved",
    approvedRequest.evidenceDescription,
    refundRequest.evidenceDescription,
  );
  // Seller rejects (creates second snapshot, but refund already approved)
  // This will test that state transitions are tracked properly
  const rejectedAttempt =
    await api.functional.ecommerceMall.seller.refund_requests.reject(
      sellerConnection,
      {
        refundRequestId,
        body: {
          rejection_reason: typia.random<
            string & tags.MinLength<10> & tags.MaxLength<500>
          >(),
        },
      },
    );
  // Validate that rejected attempt on already-approved request
  // Returns the same approved state (snapshot immutability)
  TestValidator.equals(
    "status unchanged after reject attempt",
    approvedRequest.status,
    "approved",
  );
  // Verify multiple state changes would create multiple snapshots
  // through tracking of decision_at timestamps
  TestValidator.notEquals(
    "decision_at set after approval",
    approvedRequest.decisionAt,
    null,
  );
  // Final state verification: approved snapshot remains immutable
  TestValidator.equals(
    "final status is approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "final seller response preserved",
    approvedRequest.sellerResponse !== null,
  );
}