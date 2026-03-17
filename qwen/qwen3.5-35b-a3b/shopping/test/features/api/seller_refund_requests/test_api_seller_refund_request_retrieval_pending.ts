import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_refund_request_retrieval_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  // Create seller connection with token for API calls
  const sellerAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: sellerAuthorized.token.access },
  };
  // 2. Generate test refund request ID
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve refund request
  const refundRequest =
    await api.functional.ecommerceMall.seller.refund_requests.at(
      sellerAuthConnection,
      {
        refundRequestId,
      },
    );
  typia.assert(refundRequest);
  // 4. Validate refund request status is pending
  TestValidator.equals(
    "refund request status is pending",
    refundRequest.status,
    "pending",
  );
  // 5. Validate seller-specific fields are null (pending state)
  TestValidator.equals(
    "seller response is null for pending",
    refundRequest.sellerResponse,
    null,
  );
  TestValidator.equals(
    "rejection reason is null for pending",
    refundRequest.rejectionReason,
    null,
  );
  TestValidator.equals(
    "decision_at is null for pending",
    refundRequest.decisionAt,
    null,
  );
  TestValidator.equals(
    "processed_at is null for pending",
    refundRequest.processedAt,
    null,
  );
  // 6. Validate customer information
  TestValidator.predicate("customer has valid UUID ID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      refundRequest.customer.id,
    ),
  );
  TestValidator.predicate("customer has valid email format", () =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(refundRequest.customer.email),
  );
  TestValidator.predicate("customer status is valid", () =>
    ["active", "suspended", "deleted"].includes(refundRequest.customer.status),
  );
  TestValidator.predicate(
    "customer has valid ISO 8601 created_at",
    () => !Number.isNaN(Date.parse(refundRequest.customer.created_at)),
  );
  // 7. Validate order item details
  TestValidator.predicate("order item has valid UUID ID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      refundRequest.orderItem.id,
    ),
  );
  TestValidator.predicate(
    "order item has product name",
    () =>
      typeof refundRequest.orderItem.productName === "string" &&
      refundRequest.orderItem.productName.length > 0,
  );
  TestValidator.predicate(
    "order item has product SKU",
    () =>
      typeof refundRequest.orderItem.productSku === "string" &&
      refundRequest.orderItem.productSku.length > 0,
  );
  TestValidator.predicate(
    "order item has variant name",
    () =>
      typeof refundRequest.orderItem.variantName === "string" &&
      refundRequest.orderItem.variantName.length > 0,
  );
  TestValidator.predicate(
    "order item quantity is positive integer",
    () =>
      typeof refundRequest.orderItem.quantity === "number" &&
      Number.isInteger(refundRequest.orderItem.quantity) &&
      refundRequest.orderItem.quantity >= 1,
  );
  TestValidator.predicate(
    "order item unit price is positive number",
    () =>
      typeof refundRequest.orderItem.unitPrice === "number" &&
      refundRequest.orderItem.unitPrice >= 0,
  );
  TestValidator.predicate(
    "order item total price is positive number",
    () =>
      typeof refundRequest.orderItem.totalPrice === "number" &&
      refundRequest.orderItem.totalPrice >= 0,
  );
  // Validate order item status
  TestValidator.predicate("order item status is valid", () =>
    [
      "paid",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
      "partially_completed",
    ].includes(refundRequest.orderItem.status),
  );
  // 8. Validate order reference
  TestValidator.predicate("order has valid UUID ID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      refundRequest.orderItem.order.id,
    ),
  );
  TestValidator.predicate(
    "order has order number",
    () =>
      typeof refundRequest.orderItem.order.order_number === "string" &&
      refundRequest.orderItem.order.order_number.length > 0,
  );
  TestValidator.predicate(
    "order has valid total price",
    () =>
      typeof refundRequest.orderItem.order.total_price === "number" &&
      refundRequest.orderItem.order.total_price >= 0,
  );
  // 9. Validate refund request metadata
  TestValidator.predicate(
    "refund code is non-empty string",
    () =>
      typeof refundRequest.refundCode === "string" &&
      refundRequest.refundCode.length > 0,
  );
  TestValidator.predicate(
    "reason is non-empty string",
    () =>
      typeof refundRequest.reason === "string" &&
      refundRequest.reason.length > 0,
  );
  TestValidator.predicate(
    "evidenceDescription is string or null",
    () =>
      typeof refundRequest.evidenceDescription === "string" ||
      refundRequest.evidenceDescription === null,
  );
  TestValidator.predicate(
    "deliveryDate is valid ISO 8601",
    () => !Number.isNaN(Date.parse(refundRequest.deliveryDate)),
  );
  TestValidator.predicate(
    "submittedAt is valid ISO 8601 or null",
    () =>
      refundRequest.submittedAt === null ||
      !Number.isNaN(Date.parse(refundRequest.submittedAt)),
  );
  TestValidator.predicate(
    "createdAt is valid ISO 8601",
    () => !Number.isNaN(Date.parse(refundRequest.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is valid ISO 8601",
    () => !Number.isNaN(Date.parse(refundRequest.updatedAt)),
  );
}
