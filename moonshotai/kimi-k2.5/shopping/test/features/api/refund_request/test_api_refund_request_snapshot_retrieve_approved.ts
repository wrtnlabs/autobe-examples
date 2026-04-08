import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

export async function test_api_refund_request_snapshot_retrieve_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated connections for both actors
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {},
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  // 2. Create a refund request using the utility function
  const customerReason = RandomGenerator.paragraph({ sentences: 5 });
  const refundRequest =
    await generate_random_ecommerce_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          reason: customerReason,
        },
      },
    );
  typia.assert(refundRequest);
  // Verify initial status is pending
  TestValidator.equals(
    "initial refund request status",
    refundRequest.status,
    "pending",
  );
  // 3. Seller approves the refund request with a response reason
  const sellerResponseReason = RandomGenerator.paragraph({ sentences: 3 });
  const approvedRefundRequest =
    await api.functional.ecommerceMall.seller.refund_requests.update(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          status: "approved",
          responseReason: sellerResponseReason,
        } satisfies IEcommerceMallRefundRequest.IUpdate,
      },
    );
  typia.assert(approvedRefundRequest);
  // 4. Verify approval and locate the snapshot
  TestValidator.equals(
    "refund request status after approval",
    approvedRefundRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "refund request has snapshots",
    approvedRefundRequest.snapshots.length > 0,
  );
  TestValidator.predicate(
    "refund request has respondedAt",
    approvedRefundRequest.respondedAt !== null,
  );
  // Get the most recent snapshot (the one created from our approval)
  const snapshot =
    approvedRefundRequest.snapshots[approvedRefundRequest.snapshots.length - 1];
  typia.assert(snapshot);
  // 5. Seller retrieves the specific snapshot by ID
  const retrievedSnapshot =
    await api.functional.ecommerceMall.seller.refund_requests.snapshots.at(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        snapshotId: snapshot.id,
      },
    );
  typia.assert(retrievedSnapshot);
  // 6. Validate snapshot fields are correctly preserved
  TestValidator.equals(
    "snapshot belongs to correct refund request",
    retrievedSnapshot.refundRequestId,
    refundRequest.id,
  );
  TestValidator.equals(
    "snapshot preserves customer reason",
    retrievedSnapshot.reason,
    customerReason,
  );
  TestValidator.equals(
    "snapshot reflects approved status",
    retrievedSnapshot.status,
    "approved",
  );
  TestValidator.equals(
    "snapshot preserves seller response reason",
    retrievedSnapshot.responseReason,
    sellerResponseReason,
  );
  TestValidator.predicate(
    "snapshot has valid created timestamp",
    retrievedSnapshot.createdAt !== null,
  );
}
