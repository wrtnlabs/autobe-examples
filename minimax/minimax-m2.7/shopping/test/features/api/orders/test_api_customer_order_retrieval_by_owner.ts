import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCheckoutPrepareItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutPrepareItem";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";

export async function test_api_customer_order_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // 2. Create cart item with product for checkout
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // 3. Prepare checkout to validate cart and get address info
  const checkoutPrepare =
    await api.functional.ecommerceMall.customer.checkout.prepare(
      customerConnection,
    );
  typia.assert(checkoutPrepare);
  // 4. Confirm checkout and create the order
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: typia.random<string>(),
        } satisfies import("@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm").IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  const orderId = order.id;
  // 5. Retrieve the order by its unique identifier
  const retrievedOrder = await api.functional.ecommerceMall.customer.orders.at(
    customerConnection,
    { orderId },
  );
  typia.assert(retrievedOrder);
  // 6. Validations - Business logic checks
  TestValidator.equals("order id matches", retrievedOrder.id, orderId);
  TestValidator.equals(
    "customer id matches",
    retrievedOrder.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "order number exists",
    retrievedOrder.order_number !== null,
    true,
  );
  TestValidator.predicate(
    "status is valid string",
    typeof retrievedOrder.status === "string",
  );
  TestValidator.predicate(
    "subtotal is number",
    typeof retrievedOrder.subtotal === "number",
  );
  TestValidator.predicate(
    "total_amount is number",
    typeof retrievedOrder.total_amount === "number",
  );
  // Verify shipping address structure
  TestValidator.equals(
    "shipping address exists",
    retrievedOrder.shipping_address !== null,
    true,
  );
  TestValidator.equals(
    "shipping address city",
    retrievedOrder.shipping_address.city !== null,
    true,
  );
  TestValidator.equals(
    "shipping address country",
    retrievedOrder.shipping_address.country !== null,
    true,
  );
  // Verify order items array is present and contains at least one item
  TestValidator.predicate(
    "order_items is array",
    Array.isArray(retrievedOrder.order_items),
  );
  TestValidator.predicate(
    "order_items has at least one item",
    retrievedOrder.order_items.length >= 1,
  );
  // Verify each order item contains required fields
  for (const orderItem of retrievedOrder.order_items) {
    TestValidator.predicate(
      "quantity is positive number",
      orderItem.quantity > 0,
    );
    TestValidator.predicate(
      "unit_price is positive number",
      orderItem.unit_price > 0,
    );
    TestValidator.predicate(
      "subtotal matches quantity * unit_price",
      orderItem.subtotal === orderItem.quantity * orderItem.unit_price,
    );
    TestValidator.equals(
      "productSnapshot name exists",
      orderItem.productSnapshot.name !== null,
      true,
    );
    TestValidator.equals(
      "sellerProfileSnapshot shop_name exists",
      orderItem.sellerProfileSnapshot.shop_name !== null,
      true,
    );
  }
  // Verify shipments array is present
  TestValidator.predicate(
    "shipments is array",
    Array.isArray(retrievedOrder.shipments),
  );
  // Verify timestamps are valid ISO date-time format
  TestValidator.predicate(
    "created_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedOrder.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedOrder.updated_at),
  );
  TestValidator.predicate(
    "deleted_at is null or valid date-time",
    retrievedOrder.deleted_at === null ||
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedOrder.deleted_at),
  );
}
