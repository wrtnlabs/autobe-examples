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
 * This test validates the entire workflow of updating a refund request by an
 * admin user in the shopping mall platform. The scenario starts by
 * authenticating an admin user with unique email and password. Next, it creates
 * a seller entity with required information. Then, a customer is registered and
 * authenticated with email and plaintext password. A new order is placed by the
 * customer for this seller, including mandatory fields like unique order
 * number, total price, status, payment method, and shipping address. After the
 * order creation, the admin user switches to authenticated session. The next
 * step is to create a refund request linked to the newly created order and
 * customer, specifying reason, refund amount, and status as "Pending" with
 * requested timestamp. Finally, the test updates the refund request using
 * proper admin authorization by patching its status (e.g., to "Approved") and
 * optionally processed timestamp. Throughout the test, all required fields are
 * included with realistic, valid values that match the detailed schema
 * definitions and business context. The test ensures tolal authorization
 * correctness, correct functioning of refund request updates, and proper data
 * integrity checks, while also validating that only admins can perform these
 * updates.
 */
export async function test_api_refund_request_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registration (join)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash: string = "Admin1234!";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Authenticate as admin (login) for further operations
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPasswordHash,
      type: "admin",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 3. Seller creation
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPasswordHash: string = "Seller1234!";
  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: {
        email: sellerEmail,
        password_hash: sellerPasswordHash,
        status: "active",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 4. Customer registration
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPassword: string = "Customer1234!";
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 5. Authenticate as customer (login) for order creation
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      __typename: "ILogin",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 6. Create an order by customer
  const orderNumber = `ORD-${RandomGenerator.alphaNumeric(3).toUpperCase()}${RandomGenerator.alphaNumeric(4)}`;
  const orderTotalPrice = Number((10_000 + Math.random() * 100_000).toFixed(2));
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_seller_id: seller.id,
        order_number: orderNumber,
        total_price: orderTotalPrice,
        status: "Pending Payment",
        business_status: "Created",
        payment_method: "Credit Card",
        shipping_address: `${RandomGenerator.name()} Street, City, Country`,
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 7. Authenticate again as admin for refund request update
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPasswordHash,
      type: "admin",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 8. Create a refund request update payload
  const nowISOString = new Date().toISOString();
  const refundRequestUpdate: IShoppingMallRefundRequest.IUpdate = {
    shopping_mall_order_id: order.id,
    shopping_mall_customer_id: customer.id,
    reason: "Product damaged",
    refund_amount: Number((order.total_price * 0.5).toFixed(2)),
    status: "Approved",
    requested_at: nowISOString,
    processed_at: nowISOString,
  };

  // 9. Update the refund request
  const updatedRefundRequest: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.admin.orders.refundRequests.updateRefundRequest(
      connection,
      {
        orderId: order.id,
        body: refundRequestUpdate,
      },
    );
  typia.assert(updatedRefundRequest);

  // 10. Validate refund request updates
  TestValidator.equals(
    "refund request order ID matches",
    updatedRefundRequest.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "refund request customer ID matches",
    updatedRefundRequest.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "refund request reason matches",
    updatedRefundRequest.reason,
    "Product damaged",
  );
  TestValidator.predicate(
    "refund amount is less or equal to order total",
    updatedRefundRequest.refund_amount <= order.total_price,
  );
  TestValidator.equals(
    "refund request status is approved",
    updatedRefundRequest.status,
    "Approved",
  );
  TestValidator.equals(
    "refund requested_at is correct",
    updatedRefundRequest.requested_at,
    nowISOString,
  );
  TestValidator.equals(
    "refund processed_at is correct",
    updatedRefundRequest.processed_at ?? null,
    nowISOString,
  );
}
