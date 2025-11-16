import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate customer refund request creation workflow.
 *
 * 1. Register a new customer to obtain authentication (and customer ID).
 * 2. Prepare a plausible shopping order summary and seller summary (simulate
 *    existing entities as required by DTO constraints).
 * 3. Submit a refund request as the customer, providing required fields.
 * 4. Validate refund request record has status 'pending', correct customer and
 *    seller references, correct order linkage, timestamps, and that fields such
 *    as 'admin' and 'approved_amount' are not set at creation.
 */
export async function test_api_refund_request_creation_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer (for authentication context)
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();
  const customerName = RandomGenerator.name();
  const customerPhone = RandomGenerator.mobile();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        name: customerName,
        phone: customerPhone,
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Simulate a valid order summary and seller summary (since full order creation is not possible)
  // Generate minimal but valid mock data based on DTO structure/constraints
  const order: IShoppingMallOrder.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    order_number: RandomGenerator.alphaNumeric(12),
    status: "paid",
    total_amount: 10000,
    currency: "KRW",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
  const seller: IShoppingMallSeller.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    business_name: RandomGenerator.name(2),
  };

  // 3. Compose the refund request body with valid values
  const refundRequestBody = {
    shopping_mall_order_id: order.id,
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    requested_amount: 5000,
    shopping_mall_seller_id: seller.id,
  } satisfies IShoppingMallRefundRequest.ICreate;

  // 4. Call create refund request API as the authenticated customer
  const refundRequest: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.customer.refundRequests.create(
      connection,
      {
        body: refundRequestBody,
      },
    );
  typia.assert(refundRequest);

  // 5. Validate the refund request business and audit fields
  TestValidator.equals(
    "status should be pending",
    refundRequest.status,
    "pending",
  );
  TestValidator.equals(
    "customer ID matches",
    refundRequest.customer.id,
    customer.id,
  );
  TestValidator.equals("seller ID matches", refundRequest.seller.id, seller.id);
  TestValidator.equals("order ID matches", refundRequest.order.id, order.id);
  TestValidator.equals(
    "requested amount matches",
    refundRequest.requested_amount,
    refundRequestBody.requested_amount,
  );
  TestValidator.equals(
    "reason matches",
    refundRequest.reason,
    refundRequestBody.reason,
  );
  TestValidator.equals(
    "created_at is valid ISO 8601 string",
    typeof refundRequest.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at is valid ISO 8601 string",
    typeof refundRequest.updated_at,
    "string",
  );
  TestValidator.equals(
    "approved_amount should not be set at creation",
    refundRequest.approved_amount,
    null,
  );
  TestValidator.equals(
    "admin should not be set at creation",
    refundRequest.admin,
    undefined,
  );
}
