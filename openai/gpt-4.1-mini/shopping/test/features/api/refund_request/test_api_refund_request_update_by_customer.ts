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

export async function test_api_refund_request_update_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer authentication via join
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "strongpassword1!",
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 2. Create customer record (for refund request ownership)
  const createdCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customers.create(connection, {
      body: {
        email: customerEmail,
        password_hash: "hashed_password_customer",
        nickname: "CustomerNick",
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(createdCustomer);
  TestValidator.equals(
    "created customer email matches",
    createdCustomer.email,
    customerEmail,
  );

  // 3. Create seller record
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const createdSeller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: {
        email: sellerEmail,
        password_hash: "hashed_password_seller",
        company_name: "Seller Company",
        contact_name: "Seller Contact",
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(createdSeller);
  TestValidator.equals(
    "created seller email matches",
    createdSeller.email,
    sellerEmail,
  );

  // 4. Create order associated with customer and seller
  const orderNumber = RandomGenerator.alphaNumeric(12);
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shopping_mall_customer_id: createdCustomer.id,
        shopping_mall_seller_id: createdSeller.id,
        order_number: orderNumber,
        total_price: 150.75,
        status: "Paid",
        business_status: "Processing",
        payment_method: "CreditCard",
        shipping_address: "123 Test Street, Test City",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);
  TestValidator.equals("order number matches", order.order_number, orderNumber);

  // 5. Update refund request for the order by customer
  const updatedReason = "Item was defective";
  const updatedRefundAmount = 150.75;
  const requestedAt = new Date().toISOString();
  const processedAt = new Date().toISOString();

  const refundRequestUpdateBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_customer_id: createdCustomer.id,
    reason: updatedReason,
    refund_amount: updatedRefundAmount,
    status: "Approved",
    requested_at: requestedAt,
    processed_at: processedAt,
  } satisfies IShoppingMallRefundRequest.IUpdate;

  const updatedRefundRequest: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.customer.orders.refundRequests.patchByOrderid(
      connection,
      {
        orderId: order.id,
        body: refundRequestUpdateBody,
      },
    );
  typia.assert(updatedRefundRequest);

  TestValidator.equals(
    "refund request order ID matches",
    updatedRefundRequest.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "refund request customer ID matches",
    updatedRefundRequest.shopping_mall_customer_id,
    createdCustomer.id,
  );
  TestValidator.equals(
    "refund reason matches",
    updatedRefundRequest.reason,
    updatedReason,
  );
  TestValidator.equals(
    "refund amount matches",
    updatedRefundRequest.refund_amount,
    updatedRefundAmount,
  );
  TestValidator.equals(
    "refund status matches",
    updatedRefundRequest.status,
    "Approved",
  );
  TestValidator.equals(
    "requested_at matches",
    updatedRefundRequest.requested_at,
    requestedAt,
  );
  TestValidator.equals(
    "processed_at matches",
    updatedRefundRequest.processed_at,
    processedAt,
  );

  // 6. Admin join and login for possible authorization context (role switch)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPwd1!";

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        full_name: "Admin User",
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        type: "admin",
        remember_me: false,
      } satisfies IShoppingMallAdmin.ILogin,
    });
  typia.assert(adminLoggedIn);
}
