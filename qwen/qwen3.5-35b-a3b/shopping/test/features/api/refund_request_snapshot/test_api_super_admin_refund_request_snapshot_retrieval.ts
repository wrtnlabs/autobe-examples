import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

export async function test_api_super_admin_refund_request_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super Admin Authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Customer Authentication and Refund Request Creation
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Create refund request - using random orderItemId for testing
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const refundRequest =
    await api.functional.ecommerceMall.customer.refund_requests.create(
      customerConnection,
      {
        orderItemId,
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          evidence_description: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IEcommerceMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 3. Seller Authentication and Refund Request Approval
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // Approve the refund request
  const approvedRequest =
    await api.functional.ecommerceMall.seller.refund_requests.approve(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          action: "approve" as const,
        } satisfies IEcommerceMallRefundRequest.IApproval,
      },
    );
  typia.assert(approvedRequest);
  // 4. Super Admin retrieves snapshots
  const snapshotsResponse =
    await api.functional.ecommerceMall.superAdmin.refund_requests.snapshots.index(
      superAdminConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "pagination has records",
    snapshotsResponse.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    snapshotsResponse.pagination.limit >= 1,
  );
  TestValidator.equals(
    "pagination records matches snapshot count",
    snapshotsResponse.pagination.records,
    snapshotsResponse.data.length,
  );
  // 6. Validate snapshot count and ordering
  TestValidator.predicate(
    "snapshots returned",
    snapshotsResponse.data.length > 0,
  );
  // 7. Verify snapshots are sorted by created_at DESC (newest first)
  const snapshots = snapshotsResponse.data;
  for (let i = 1; i < snapshots.length; i++) {
    const prevSnapshot = snapshots[i - 1];
    const currSnapshot = snapshots[i];
    TestValidator.predicate(
      `snapshot ordering check at index ${i}: ${prevSnapshot.createdAt} should be >= ${currSnapshot.createdAt}`,
      new Date(prevSnapshot.createdAt).getTime() >=
        new Date(currSnapshot.createdAt).getTime(),
    );
  }
  // 8. Verify each snapshot contains required fields with correct types
  for (const snapshot of snapshots) {
    typia.assert(snapshot);
    // Verify refund_request_id matches the request we created
    TestValidator.equals(
      "snapshot refund_request_id matches",
      snapshot.refundRequestId,
      refundRequest.id,
    );
    // Verify actor type
    TestValidator.predicate(
      "snapshot actorType is valid",
      ["customer", "seller", "admin", "super_admin"].includes(
        snapshot.actorType,
      ),
    );
    // Verify action type
    TestValidator.predicate(
      "snapshot actionType is valid",
      [
        "created",
        "status_changed",
        "approved",
        "rejected",
        "response_added",
      ].includes(snapshot.actionType),
    );
    // Verify timestamps are valid ISO 8601 format
    const createdDate = new Date(snapshot.createdAt);
    TestValidator.predicate(
      "snapshot createdAt is valid date",
      !isNaN(createdDate.getTime()),
    );
  }
  // 9. Verify initial "created" snapshot exists
  const createdSnapshot = snapshots.find((s) => s.actionType === "created");
  TestValidator.predicate(
    "snapshot includes created action",
    createdSnapshot !== undefined,
  );
  // If created snapshot exists, verify status_before is null for newly created request
  if (createdSnapshot) {
    TestValidator.equals(
      "created snapshot status_before is null",
      createdSnapshot.statusBefore,
      null,
    );
  }
  // 10. Verify approval snapshot contains correct status transition
  const approvedSnapshot = snapshots.find((s) => s.actionType === "approved");
  TestValidator.predicate(
    "snapshot includes approval action",
    approvedSnapshot !== undefined,
  );
  if (approvedSnapshot) {
    TestValidator.equals(
      "approved snapshot status_after is approved",
      approvedSnapshot.statusAfter,
      "approved",
    );
    TestValidator.equals(
      "approved snapshot actorType is seller",
      approvedSnapshot.actorType,
      "seller",
    );
  }
}