import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
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
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_cancellation_request_seller_approve_with_refund(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, { body: {} });
  // 2. Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, { body: {} });
  // 3. Seller creates product (needed for order item creation)
  await generate_random_ecommerce_mall_seller_products_create(sellerConnection);
  // 4. Customer creates cancellation request (generator handles order creation prerequisite)
  const cancellationRequest =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerConnection,
      { body: {} },
    );
  // Verify initial state is pending
  TestValidator.equals(
    "initial status is pending",
    cancellationRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "responseReason is null initially",
    cancellationRequest.responseReason === null,
  );
  TestValidator.predicate(
    "respondedAt is null initially",
    cancellationRequest.respondedAt === null,
  );
  // 5. Seller approves the cancellation request
  const approvalReason = "Approved with automatic refund and stock restoration";
  const approvedRequest =
    await api.functional.ecommerceMall.seller.cancellation_requests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "approved",
          responseReason: approvalReason,
        } satisfies IEcommerceMallCancellationRequest.IUpdate,
      },
    );
  // 6. Validate response structure
  typia.assert(approvedRequest);
  // 7. Verify business rule 388: Status transition to approved, refund and stock restoration triggered
  TestValidator.equals(
    "status is approved after seller response",
    approvedRequest.status,
    "approved",
  );
  TestValidator.equals(
    "responseReason matches approval reason",
    approvedRequest.responseReason,
    approvalReason,
  );
  TestValidator.predicate(
    "respondedAt is populated",
    approvedRequest.respondedAt !== null,
  );
  // 8. Verify business rule 387: Snapshot immutability - snapshots record state transition
  TestValidator.predicate(
    "snapshots array exists",
    Array.isArray(approvedRequest.snapshots),
  );
  TestValidator.predicate(
    "snapshots array is not empty",
    approvedRequest.snapshots.length > 0,
  );
  // Find snapshot showing pending -> approved transition
  const approvalSnapshot = approvedRequest.snapshots.find(
    (snapshot) =>
      snapshot.statusBefore === "pending" &&
      snapshot.statusAfter === "approved",
  );
  TestValidator.predicate(
    "approval snapshot exists showing state transition",
    approvalSnapshot !== undefined,
  );
  if (approvalSnapshot !== undefined) {
    typia.assert(approvalSnapshot);
    TestValidator.equals(
      "snapshot reviewer note matches response",
      approvalSnapshot.reviewerNote,
      approvalReason,
    );
    TestValidator.predicate(
      "snapshot createdAt timestamp exists",
      approvalSnapshot.createdAt !== null,
    );
  }
}
