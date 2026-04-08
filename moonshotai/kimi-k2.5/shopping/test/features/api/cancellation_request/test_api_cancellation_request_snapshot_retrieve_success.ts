import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
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
import { generate_random_ecommerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_cancellation_requests_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";

export async function test_api_cancellation_request_snapshot_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Setup seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Create cancellation request using utility function
  const cancellationRequest =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {},
    );
  typia.assert(cancellationRequest);
  // 4. Seller responds to the cancellation request (approves or rejects)
  const statusValues = ["approved", "rejected"] as const;
  const newStatus = RandomGenerator.pick(statusValues);
  const responseReason = RandomGenerator.pick([
    "Request approved as per policy",
    "Request rejected due to order already processed",
  ]);
  const updateBody = {
    status: newStatus,
    responseReason,
  } satisfies IEcommerceMallCancellationRequest.IUpdate;
  const updatedRequest =
    await api.functional.ecommerceMall.seller.cancellation_requests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: updateBody,
      },
    );
  typia.assert(updatedRequest);
  // 5. Get snapshot from updated cancellation request and retrieve snapshot by ID
  TestValidator.predicate(
    "cancellation request has snapshots after seller response",
    () => updatedRequest.snapshots.length > 0,
  );
  const snapshot = updatedRequest.snapshots[0]!;
  const retrievedSnapshot =
    await api.functional.ecommerceMall.seller.cancellation_requests.snapshots.at(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        snapshotId: snapshot.id,
      },
    );
  typia.assert(retrievedSnapshot);
  // 6. Validate snapshot data
  TestValidator.equals(
    "snapshot cancellationRequestId matches",
    retrievedSnapshot.cancellationRequestId,
    cancellationRequest.id,
  );
  TestValidator.equals(
    "snapshot statusBefore is pending",
    retrievedSnapshot.statusBefore,
    "pending",
  );
  TestValidator.equals(
    "snapshot statusAfter matches update",
    retrievedSnapshot.statusAfter,
    newStatus,
  );
  TestValidator.equals(
    "snapshot reasonBefore matches original",
    retrievedSnapshot.reasonBefore,
    cancellationRequest.reason,
  );
  TestValidator.equals(
    "snapshot reviewerNote matches response",
    retrievedSnapshot.reviewerNote,
    responseReason,
  );
}
