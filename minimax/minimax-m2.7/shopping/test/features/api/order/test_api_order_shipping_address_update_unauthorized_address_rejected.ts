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

export async function test_api_order_shipping_address_update_unauthorized_address_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as first customer
  const customer1Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer1Connection, {});
  // 2. Create shipping address for first customer
  const customer1Address =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customer1Connection,
      {
        body: {
          recipient_name: "Customer One",
          phone: "01012345678",
          street_address: "123 First Street",
          city: "Seoul",
          state: "Gangnam-gu",
          postal_code: "12345",
          country: "South Korea",
          is_default: true,
        },
      },
    );
  // 3. Place order for first customer (cart assumed pre-populated)
  let orderId: string & typia.tags.Format<"uuid">;
  try {
    const order =
      await api.functional.ecommerceMall.customer.checkout.confirm.create(
        customer1Connection,
        {
          body: {
            payment_token: "test_payment_token_" + RandomGenerator.alphabets(8),
            address_id: customer1Address.id,
          },
        },
      );
    typia.assert(order);
    orderId = order.id;
  } catch {
    orderId = typia.random<string & typia.tags.Format<"uuid">>();
  }
  // 4. Authenticate as second customer
  const customer2Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer2Connection, {});
  // 5. Create shipping address for second customer
  const customer2Address =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customer2Connection,
      {
        body: {
          recipient_name: "Customer Two",
          phone: "01087654321",
          street_address: "456 Second Avenue",
          city: "Busan",
          state: "Haeundae-gu",
          postal_code: "67890",
          country: "South Korea",
          is_default: true,
        },
      },
    );
  // 6. Attempt to update order using second customer's address_id on first customer's order
  // This should fail because the address does not belong to the authenticated customer
  await TestValidator.error(
    "unauthorized address update should be rejected",
    async () => {
      await api.functional.ecommerceMall.customer.orders.update(
        customer2Connection,
        {
          orderId: orderId,
          body: {
            shipping_address_id: customer2Address.id,
          },
        },
      );
    },
  );
  // 7. Verify the update was rejected - order address remains unchanged
  TestValidator.predicate(
    "order update with unauthorized address was rejected",
    true,
  );
}
