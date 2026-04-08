import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_cancellation_requests_create";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_cart_items_create";
import { generate_random_ecommerce_mall_customer_customers_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_checkout_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_cancellation_request_retrieval_by_owner_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins (may be pending without admin approval)
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Customer joins - token is set in customerConnection headers
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  // 3. Create shipping address for the customer
  await generate_random_ecommerce_mall_customer_customers_addresses_create(
    customerConnection,
    {},
  );
  // 4. Add product to cart and checkout (attempt - may fail without approved seller)
  // This is an environmental limitation
  let orderItemId: string | undefined;
  try {
    await generate_random_ecommerce_mall_customer_customers_cart_items_create(
      customerConnection,
      {},
    );
    const checkout =
      await generate_random_ecommerce_mall_customer_customers_checkout_create(
        customerConnection,
        {},
      );
    if (checkout.orderItems && checkout.orderItems.length > 0) {
      orderItemId = checkout.orderItems[0].id;
    }
  } catch {
    // Checkout may fail without approved seller - continue with test
  }
  // 5. If we have an order item, submit cancellation request
  let cancellationRequestId: string;
  if (orderItemId) {
    const cancellation =
      await generate_random_ecommerce_mall_customer_cancellation_requests_create(
        customerConnection,
        {
          body: {
            orderItemId: orderItemId,
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    cancellationRequestId = cancellation.id;
  } else {
    throw new Error(
      "Cannot test cancellation request retrieval without approved seller and order. Please ensure seller is approved by admin.",
    );
  }
  // 6. Retrieve cancellation request by ID
  const cancellationRequest =
    await api.functional.ecommerceMall.customer.cancellation_requests.at(
      customerConnection,
      {
        requestId: cancellationRequestId,
      },
    );
  // 7. Validate response with typia
  typia.assert(cancellationRequest);
  // 8. Security check - verify customer ID matches authenticated customer
  TestValidator.equals(
    "customer ID matches authenticated customer",
    cancellationRequest.customer.id,
    customer.id,
  );
}
