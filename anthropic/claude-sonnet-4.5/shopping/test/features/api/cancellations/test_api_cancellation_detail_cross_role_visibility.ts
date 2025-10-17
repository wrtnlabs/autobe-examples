import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellation";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Test cross-role visibility for order cancellation details.
 *
 * This test validates that different user roles (customer, admin) can
 * appropriately access cancellation details based on their relationship to the
 * order. The test creates a complete cancellation scenario and verifies proper
 * role-based access control for cancellation detail retrieval.
 *
 * Workflow:
 *
 * 1. Create customer account and authenticate
 * 2. Set up delivery address for order placement
 * 3. Set up payment method for order creation
 * 4. Create an order
 * 5. Request cancellation of the order
 * 6. Customer retrieves their own cancellation details (should succeed)
 * 7. Create admin account and authenticate
 * 8. Admin retrieves the cancellation details (should succeed with full access)
 * 9. Validate cancellation data integrity across different role accesses
 */
export async function test_api_cancellation_detail_cross_role_visibility(
  connection: api.IConnection,
) {
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<string & tags.MinLength<8>>();

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  const address = await api.functional.shoppingMall.customer.addresses.create(
    connection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        address_line1: RandomGenerator.paragraph({ sentences: 3 }),
        city: RandomGenerator.name(1),
        state_province: RandomGenerator.name(1),
        postal_code: typia
          .random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<10000> &
              tags.Maximum<99999>
          >()
          .toString(),
        country: "United States",
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address);

  const paymentMethod =
    await api.functional.shoppingMall.customer.paymentMethods.create(
      connection,
      {
        body: {
          payment_type: "credit_card",
          gateway_token: RandomGenerator.alphaNumeric(32),
        } satisfies IShoppingMallPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  const orderResponse =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        delivery_address_id: address.id,
        payment_method_id: paymentMethod.id,
        shipping_method: "standard",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(orderResponse);

  TestValidator.predicate(
    "order creation should return at least one order ID",
    orderResponse.order_ids.length > 0,
  );

  const orderId = orderResponse.order_ids[0];

  const cancellationResponse =
    await api.functional.shoppingMall.customer.orders.cancel(connection, {
      orderId: orderId,
      body: {
        cancellation_reason: "customer_changed_mind",
      } satisfies IShoppingMallOrder.ICancelRequest,
    });
  typia.assert(cancellationResponse);

  TestValidator.equals(
    "cancellation response order ID matches",
    cancellationResponse.order_id,
    orderId,
  );

  const cancellationId = cancellationResponse.cancellation_id;

  const customerCancellationView =
    await api.functional.shoppingMall.cancellations.at(connection, {
      cancellationId: cancellationId,
    });
  typia.assert(customerCancellationView);

  TestValidator.equals(
    "customer can view their own cancellation",
    customerCancellationView.id,
    cancellationId,
  );

  TestValidator.predicate(
    "cancellation status should be valid",
    typeof customerCancellationView.cancellation_status === "string" &&
      customerCancellationView.cancellation_status.length > 0,
  );

  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      role_level: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  const adminCancellationView =
    await api.functional.shoppingMall.cancellations.at(connection, {
      cancellationId: cancellationId,
    });
  typia.assert(adminCancellationView);

  TestValidator.equals(
    "admin can view any cancellation with unrestricted access",
    adminCancellationView.id,
    cancellationId,
  );

  TestValidator.equals(
    "cancellation status is consistent across roles",
    customerCancellationView.cancellation_status,
    adminCancellationView.cancellation_status,
  );
}
