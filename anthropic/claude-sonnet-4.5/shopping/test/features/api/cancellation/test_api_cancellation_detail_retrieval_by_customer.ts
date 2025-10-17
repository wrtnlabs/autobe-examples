import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellation";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Test customer's ability to retrieve detailed cancellation information.
 *
 * Validates the complete workflow where a customer creates an account, places
 * an order, submits a cancellation request, and then retrieves the detailed
 * cancellation information.
 *
 * This test ensures that:
 *
 * 1. Customer can successfully authenticate and create necessary order
 *    prerequisites
 * 2. Order can be created with proper delivery address and payment method
 * 3. Cancellation request can be submitted for the order
 * 4. Cancellation details can be retrieved using the cancellation ID
 * 5. Retrieved cancellation contains complete workflow information
 *
 * Test Flow:
 *
 * 1. Register and authenticate as a customer
 * 2. Create delivery address for order placement
 * 3. Create payment method for order processing
 * 4. Place an order with the created address and payment method
 * 5. Submit a cancellation request for the order
 * 6. Retrieve the cancellation details using cancellation ID
 * 7. Validate the response structure and completeness
 */
export async function test_api_cancellation_detail_retrieval_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as customer
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

  // Step 2: Create delivery address for order placement
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

  // Step 3: Create payment method for order processing
  const paymentMethod =
    await api.functional.shoppingMall.customer.paymentMethods.create(
      connection,
      {
        body: {
          payment_type: "credit_card",
          gateway_token: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IShoppingMallPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // Step 4: Place an order
  const orderResponse =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        delivery_address_id: address.id,
        payment_method_id: paymentMethod.id,
        shipping_method: "standard",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(orderResponse);

  // Verify order was created successfully
  TestValidator.predicate(
    "order creation should return order IDs",
    orderResponse.order_ids.length > 0,
  );

  const orderId = typia.assert<string & tags.Format<"uuid">>(
    orderResponse.order_ids[0]!,
  );

  // Step 5: Submit cancellation request for the order
  const cancellationResponse =
    await api.functional.shoppingMall.customer.orders.cancel(connection, {
      orderId: orderId,
      body: {
        cancellation_reason: "customer_changed_mind",
      } satisfies IShoppingMallOrder.ICancelRequest,
    });
  typia.assert(cancellationResponse);

  // Verify cancellation request was submitted successfully
  TestValidator.predicate(
    "cancellation response should have cancellation ID",
    cancellationResponse.cancellation_id.length > 0,
  );

  const cancellationId = cancellationResponse.cancellation_id;

  // Step 6: Retrieve cancellation details using the cancellation ID
  const cancellationDetail = await api.functional.shoppingMall.cancellations.at(
    connection,
    {
      cancellationId: cancellationId,
    },
  );
  typia.assert(cancellationDetail);

  // Step 7: Validate the cancellation detail structure and completeness
  TestValidator.equals(
    "cancellation ID matches",
    cancellationDetail.id,
    cancellationId,
  );
  TestValidator.predicate(
    "cancellation status is present",
    cancellationDetail.cancellation_status.length > 0,
  );
}
