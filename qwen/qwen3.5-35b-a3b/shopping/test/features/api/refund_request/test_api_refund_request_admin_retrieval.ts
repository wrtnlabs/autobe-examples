import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_refund_request_admin_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Create admin connection with token for API calls
  const adminApiConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminAuth.token.access },
  };
  // 2. Retrieve refund request with valid UUID
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  const refundRequest =
    await api.functional.ecommerceMall.admin.refund_requests.at(
      adminApiConnection,
      {
        refundRequestId,
      },
    );
  typia.assert(refundRequest);
  // 3. Validate response structure - all fields present per IEcommerceMallRefundRequest DTO
  // The single typia.assert(refundRequest) above already validates all field types and formats
  // 4. Validate business relationships are properly joined
  // Customer relationship must be populated
  TestValidator.equals(
    "customer relationship is populated",
    refundRequest.customer.id !== undefined,
    true,
  );
  // OrderItem relationship must be populated
  TestValidator.equals(
    "orderItem relationship is populated",
    refundRequest.orderItem.id !== undefined,
    true,
  );
  // OrderItem.order relationship must be populated (JOIN query result)
  TestValidator.equals(
    "orderItem has order relationship",
    refundRequest.orderItem.order.id !== undefined,
    true,
  );
  // Shipping address must be populated (order.shipping_address JOIN)
  TestValidator.equals(
    "order has shipping address relationship",
    refundRequest.orderItem.order.shipping_address.id !== undefined,
    true,
  );
  // 5. Validate refund request data consistency
  TestValidator.predicate(
    "customer has valid email format",
    refundRequest.customer.email.includes("@"),
  );
  // 6. Validate timestamps are in proper format (ISO 8601)
  TestValidator.predicate(
    "deliveryDate is valid datetime format",
    !isNaN(Date.parse(refundRequest.deliveryDate)),
  );
  TestValidator.predicate(
    "createdAt is valid datetime format",
    !isNaN(Date.parse(refundRequest.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is valid datetime format",
    !isNaN(Date.parse(refundRequest.updatedAt)),
  );
  // Nullable timestamps should also parse if not null
  if (refundRequest.submittedAt !== null) {
    TestValidator.predicate(
      "submittedAt is valid datetime format",
      !isNaN(Date.parse(refundRequest.submittedAt)),
    );
  }
  if (refundRequest.decisionAt !== null) {
    TestValidator.predicate(
      "decisionAt is valid datetime format",
      !isNaN(Date.parse(refundRequest.decisionAt)),
    );
  }
  if (refundRequest.processedAt !== null) {
    TestValidator.predicate(
      "processedAt is valid datetime format",
      !isNaN(Date.parse(refundRequest.processedAt)),
    );
  }
  // 7. Validate orderItem order relationship integrity
  TestValidator.predicate(
    "order has valid order_number",
    refundRequest.orderItem.order.order_number.length > 0,
  );
  TestValidator.predicate(
    "order has valid total_price",
    refundRequest.orderItem.order.total_price > 0,
  );
  // 8. Validate shipping address has required fields
  TestValidator.predicate(
    "shipping address has recipient_name",
    refundRequest.orderItem.order.shipping_address.recipient_name.length > 0,
  );
  TestValidator.predicate(
    "shipping address has valid city",
    refundRequest.orderItem.order.shipping_address.city.length > 0,
  );
  TestValidator.predicate(
    "shipping address has valid state",
    refundRequest.orderItem.order.shipping_address.state.length > 0,
  );
  // 9. Validate orderItem has valid product data
  TestValidator.predicate(
    "orderItem has product name",
    refundRequest.orderItem.productName.length > 0,
  );
  TestValidator.predicate(
    "orderItem has product SKU",
    refundRequest.orderItem.productSku.length > 0,
  );
  TestValidator.predicate(
    "orderItem quantity is positive",
    refundRequest.orderItem.quantity >= 1,
  );
  TestValidator.predicate(
    "orderItem unit price is positive",
    refundRequest.orderItem.unitPrice > 0,
  );
  TestValidator.predicate(
    "orderItem total price is positive",
    refundRequest.orderItem.totalPrice > 0,
  );
  // 10. Validate refund request has required string fields
  TestValidator.predicate(
    "refund request has valid status",
    refundRequest.status.length > 0,
  );
  TestValidator.predicate(
    "refund request has reason",
    refundRequest.reason.length > 0,
  );
  TestValidator.predicate(
    "refund request has valid refundCode",
    refundRequest.refundCode.length > 0,
  );
  // 11. Validate customer has required fields
  TestValidator.predicate(
    "customer has valid email",
    refundRequest.customer.email.length > 0,
  );
  TestValidator.predicate(
    "customer has valid status",
    refundRequest.customer.status.length > 0,
  );
}
