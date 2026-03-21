import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_order_shipping_address_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // 2. Create first shipping address (initial address for checkout)
  const firstAddress =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address: `${RandomGenerator.alphabets(5)} Street ${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<999>>()}`,
          city: RandomGenerator.name(1),
          state: RandomGenerator.name(1),
          postal_code: String(
            typia.random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<10000> &
                tags.Maximum<99999>
            >(),
          ),
          country: "Korea",
          is_default: true,
        },
      },
    );
  typia.assert(firstAddress);
  // 3. Create second shipping address (new address to switch to)
  const secondAddress =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address: `${RandomGenerator.alphabets(5)} Avenue ${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<999>>()}`,
          city: RandomGenerator.name(1),
          state: RandomGenerator.name(1),
          postal_code: String(
            typia.random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<10000> &
                tags.Maximum<99999>
            >(),
          ),
          country: "Korea",
          is_default: false,
        },
      },
    );
  typia.assert(secondAddress);
  // 4. Create order with 'paid' status via checkout
  // Note: Checkout creates order with items from cart and marks as 'paid'
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: typia.random<string>(),
          address_id: firstAddress.id,
        },
      },
    );
  typia.assert(order);
  // 5. Capture original order values before update
  const originalOrderNumber = order.orderNumber;
  const originalSubtotal = order.subtotal;
  const originalTotalAmount = order.totalAmount;
  const originalShippingAddressId = order.shippingAddress.id;
  // 6. Verify initial address is the first address
  TestValidator.equals(
    "initial address matches first address",
    originalShippingAddressId,
    firstAddress.id,
  );
  // 7. Update order shipping address to second address
  const updatedOrder =
    await api.functional.ecommerceMall.customer.orders.update(
      customerConnection,
      {
        orderId: order.id,
        body: {
          shipping_address_id: secondAddress.id,
        },
      },
    );
  typia.assert(updatedOrder);
  // 8. Verify the shipping_address_id field reflects the new address
  TestValidator.equals(
    "updated address matches second address",
    updatedOrder.shippingAddress.id,
    secondAddress.id,
  );
  // 9. Verify the order number remains unchanged
  TestValidator.equals(
    "order number unchanged",
    updatedOrder.orderNumber,
    originalOrderNumber,
  );
  // 10. Verify the subtotal remains unchanged
  TestValidator.equals(
    "subtotal unchanged",
    updatedOrder.subtotal,
    originalSubtotal,
  );
  // 11. Verify the total_amount remains unchanged
  TestValidator.equals(
    "total amount unchanged",
    updatedOrder.totalAmount,
    originalTotalAmount,
  );
  // 12. Verify the updated_at timestamp is recent (after original creation)
  const originalCreatedAt = new Date(order.createdAt).getTime();
  const updatedUpdatedAt = new Date(updatedOrder.updatedAt).getTime();
  TestValidator.predicate(
    "updated_at is recent",
    updatedUpdatedAt >= originalCreatedAt,
  );
}
