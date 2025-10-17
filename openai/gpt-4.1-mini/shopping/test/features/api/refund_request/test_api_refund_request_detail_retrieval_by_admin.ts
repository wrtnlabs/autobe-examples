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
 * Validate detailed retrieval of refund request information by admin user.
 *
 * Business context: Admins manage refund requests linked to orders placed by
 * customers from sellers. Admin authentication is required to access refund
 * request details.
 *
 * Test Steps:
 *
 * 1. Create and login admin user.
 * 2. Create customer and seller accounts.
 * 3. Create an order associated with the customer and seller.
 * 4. Create a refund request for the order.
 * 5. Retrieve refund request details by admin.
 * 6. Assert refund request data integrity and correctness.
 */
export async function test_api_refund_request_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Secret@123";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin login
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      type: "admin",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 3. Customer create
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customers.create(connection, {
      body: {
        email: customerEmail,
        password_hash: adminPassword,
        nickname: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 4. Seller create
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: {
        email: sellerEmail,
        password_hash: adminPassword,
        company_name: RandomGenerator.name(),
        contact_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 5. Order create
  const orderNumber = `ORD-${new Date().toISOString().substring(0, 10).replace(/-/g, "")}-${RandomGenerator.alphaNumeric(6)}`;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_seller_id: seller.id,
        order_number: orderNumber,
        total_price: 10000,
        status: "Pending",
        business_status: "New",
        payment_method: "credit_card",
        shipping_address: `${RandomGenerator.mobile()} ${RandomGenerator.name()}`,
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 6. Refund request create
  const refundReason = "Product was defective";
  const refundAmount = 5000;
  const currentISODate = new Date().toISOString();
  const refundRequestBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_customer_id: customer.id,
    reason: refundReason,
    refund_amount: refundAmount,
    status: "Pending",
    requested_at: currentISODate,
  } satisfies IShoppingMallRefundRequest.ICreate;
  await api.functional.shoppingMall.customer.orders.refundRequests.createRefundRequest(
    connection,
    {
      orderId: order.id,
      body: refundRequestBody,
    },
  );

  // 7. Retrieve refund request details as admin
  // Due to API limitation, we assume refundRequestId equals order.id for this test
  const refundRequestId = order.id;

  const refundRequest: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.admin.orders.refundRequests.atRefundRequest(
      connection,
      {
        orderId: order.id,
        refundRequestId: refundRequestId as string & tags.Format<"uuid">,
      },
    );
  typia.assert(refundRequest);

  TestValidator.equals(
    "refundRequest shopping_mall_order_id equals order.id",
    refundRequest.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "refundRequest shopping_mall_customer_id equals customer.id",
    refundRequest.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "refundRequest reason matches",
    refundRequest.reason,
    refundReason,
  );
  TestValidator.equals(
    "refundRequest amount matches",
    refundRequest.refund_amount,
    refundAmount,
  );
  TestValidator.equals(
    "refundRequest status is Pending",
    refundRequest.status,
    "Pending",
  );
  TestValidator.predicate(
    "refundRequest requested_at valid ISO string",
    typeof refundRequest.requested_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]+Z$/.test(
        refundRequest.requested_at,
      ),
  );
}
