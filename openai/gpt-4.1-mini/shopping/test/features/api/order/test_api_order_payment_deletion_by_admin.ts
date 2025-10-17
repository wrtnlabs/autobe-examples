import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * End-to-end test for "Delete a Specific Payment Record of an Order by Admin"
 * endpoint.
 *
 * This test encapsulates the entire business workflow and authorization checks
 * for deleting a payment record linked to an order.
 *
 * Scenario Steps:
 *
 * 1. Admin user registration via admin join API.
 * 2. Admin user login to establish authentication context.
 * 3. Customer account creation as prerequisite for order creation.
 * 4. Seller account creation to associate with the order.
 * 5. Order creation with links to customer and seller.
 * 6. Payment creation related to the order by customer.
 * 7. Attempt to delete payment without admin authentication - expect failure.
 * 8. Admin authentication again to confirm authorization.
 * 9. Authorized deletion of the payment record by the admin.
 *
 * At each step, responses are validated with typia.assert for full type
 * verification. Error scenarios are tested using TestValidator.error ensuring
 * proper authorization checks.
 */
export async function test_api_order_payment_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1-2. Admin sign-up and login
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        full_name: "Admin User",
        phone_number: null,
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Login as admin with proper credentials
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      type: "admin",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 3. Create a customer account
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPassword = "CustomerPass123!";
  const customer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customers.create(connection, {
      body: {
        email: customerEmail,
        password_hash: customerPassword,
        nickname: "Customer",
        phone_number: null,
        status: "active",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 4. Create a seller account
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "SellerPass123!";
  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: {
        email: sellerEmail,
        password_hash: sellerPassword,
        company_name: "Test Seller Corp",
        contact_name: "Seller Contact",
        phone_number: null,
        status: "active",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 5. Create an order
  const orderNumber = `ORD-${RandomGenerator.alphaNumeric(8)}`;
  const orderTotalPrice = 1000.0;
  const orderStatus = "Pending Payment";
  const orderBusinessStatus = "New";
  const paymentMethod = "Credit Card";
  const shippingAddress = "123 Test St, Test City, TC 12345";

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_seller_id: seller.id,
        order_number: orderNumber,
        total_price: orderTotalPrice,
        status: orderStatus,
        business_status: orderBusinessStatus,
        payment_method: paymentMethod,
        shipping_address: shippingAddress,
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 6. Create a payment linked to the order
  const paymentAmount = 1000.0;
  const paymentStatus = "Completed";

  const payment: IShoppingMallPayment =
    await api.functional.shoppingMall.customer.orders.payments.createPayment(
      connection,
      {
        orderId: order.id,
        body: {
          shopping_mall_order_id: order.id,
          payment_amount: paymentAmount,
          payment_method: paymentMethod,
          payment_status: paymentStatus,
          transaction_id: null,
          confirmed_at: new Date().toISOString(),
        } satisfies IShoppingMallPayment.ICreate,
      },
    );
  typia.assert(payment);

  // 7. Attempt to delete the payment without admin authentication
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "payment deletion without admin authorization should fail",
    async () => {
      await api.functional.shoppingMall.admin.orders.payments.erasePayment(
        unauthenticatedConnection,
        {
          orderId: order.id,
          paymentId: payment.id,
        },
      );
    },
  );

  // 8. Re-authenticate as admin for deletion
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      type: "admin",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 9. Authorized deletion of the payment record
  await api.functional.shoppingMall.admin.orders.payments.erasePayment(
    connection,
    {
      orderId: order.id,
      paymentId: payment.id,
    },
  );
}
