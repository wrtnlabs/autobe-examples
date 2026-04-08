import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

export async function test_api_refund_request_snapshot_customer_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer using utility function
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 2. Create a refund request with complete flow (including seller approval)
  // The generation function handles: order creation, payment, delivery, refund request, and seller approval
  const refundRequest =
    await generate_random_ecommerce_mall_customer_refund_requests_create(
      customerConnection,
      {},
    );
  typia.assert(refundRequest);
  // 3. List refund request snapshots to get available snapshot IDs
  const snapshotsPage =
    await api.functional.ecommerceMall.customer.refund_requests.snapshots.list(
      customerConnection,
      {
        requestId: refundRequest.id,
      },
    );
  typia.assert(snapshotsPage);
  // 4. Verify at least one snapshot exists (created when seller responded)
  TestValidator.predicate("snapshot exists", snapshotsPage.data.length > 0);
  const firstSnapshot = snapshotsPage.data[0];
  // 5. Retrieve specific snapshot using the at function with the snapshotId from list
  const snapshot =
    await api.functional.ecommerceMall.customer.refund_requests.snapshots.at(
      customerConnection,
      {
        requestId: refundRequest.id,
        snapshotId: firstSnapshot.id,
      },
    );
  typia.assert(snapshot);
  // 6. Validate response matches IEcommerceMallRefundRequest.IInvert schema
  TestValidator.equals("snapshot id matches", snapshot.id, firstSnapshot.id);
  TestValidator.equals(
    "refund request reference exists",
    snapshot.refundRequest !== null,
    true,
  );
  TestValidator.equals(
    "refund request id matches",
    snapshot.refundRequest.id,
    refundRequest.id,
  );
  TestValidator.equals(
    "customer summary exists",
    snapshot.customer !== null,
    true,
  );
  TestValidator.equals(
    "customer id matches authenticated user",
    snapshot.customer.id,
    customerAuth.id,
  );
  TestValidator.equals("seller summary exists", snapshot.seller !== null, true);
  // 7. Validate snapshot data integrity
  TestValidator.equals(
    "snapshotReason is valid non-empty string",
    snapshot.snapshotReason !== null && snapshot.snapshotReason.length > 0,
    true,
  );
  TestValidator.equals(
    "snapshotStatus is valid value",
    ["pending", "approved", "rejected"].includes(snapshot.snapshotStatus),
    true,
  );
  TestValidator.equals(
    "sellerResponse is valid value",
    ["approved", "rejected"].includes(snapshot.sellerResponse),
    true,
  );
  TestValidator.predicate(
    "sellerResponseAt is valid ISO datetime",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(snapshot.sellerResponseAt),
  );
  TestValidator.predicate(
    "createdAt is valid ISO datetime",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(snapshot.createdAt),
  );
  TestValidator.predicate(
    "updatedAt is valid ISO datetime",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(snapshot.updatedAt),
  );
  // 8. Validate snapshot immutability - repeated calls return same data
  const snapshotAgain =
    await api.functional.ecommerceMall.customer.refund_requests.snapshots.at(
      customerConnection,
      {
        requestId: refundRequest.id,
        snapshotId: firstSnapshot.id,
      },
    );
  typia.assert(snapshotAgain);
  TestValidator.equals(
    "snapshot is immutable - same data on repeat call",
    snapshot,
    snapshotAgain,
  );
  // 9. Validate sellerResponseReason is present only when rejected
  if (snapshot.sellerResponse === "rejected") {
    TestValidator.equals(
      "rejection reason must be present when rejected",
      snapshot.sellerResponseReason !== null &&
        snapshot.sellerResponseReason.length > 0,
      true,
    );
  }
}