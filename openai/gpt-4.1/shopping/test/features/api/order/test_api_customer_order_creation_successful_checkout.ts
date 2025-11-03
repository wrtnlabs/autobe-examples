import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import type { IShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeValue";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrder";
import type { IShoppingOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderAddress";
import type { IShoppingOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderLine";
import type { IShoppingOrderLineFulfillment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderLineFulfillment";
import type { IShoppingOrderPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderPaymentAttempt";
import type { IShoppingOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderShipment";
import type { IShoppingOrderSplit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderSplit";
import type { IShoppingOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderStatusHistory";
import type { IShoppingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProduct";
import type { IShoppingProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductAttribute";
import type { IShoppingProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductImage";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingSkuImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuImage";
import type { IShoppingSkuVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuVariant";
import type { IShoppingTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingTag";

/**
 * Validate successful customer checkout with order creation and all dependent
 * business logic, inventory checks, and security.
 *
 * 1. Seller joins and is authenticated.
 * 2. Seller creates a new product for sale.
 * 3. Seller creates an active, in-stock SKU for the new product.
 * 4. Customer joins and is authenticated.
 * 5. Customer prepares a complete, valid order with the seller's SKU. Includes
 *    inventory, addresses, payment method (string value, e.g. "card"), and
 *    total price.
 * 6. Customer successfully submits /shopping/customer/orders (checkout API) with
 *    authenticated session.
 * 7. The created order is returned and validated: order_code is nonempty, lines
 *    are created and match request, correct address and payment attempt exist,
 *    and initial status is valid.
 * 8. Repeat the request as an unauthenticated customer: API must reject the
 *    request.
 * 9. Attempt to place an order with excessive quantity (greater than available);
 *    API must reject the request.
 */
export async function test_api_customer_order_creation_successful_checkout(
  connection: api.IConnection,
) {
  // Seller joins and is authenticated
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    },
  });
  typia.assert(seller);

  // Seller creates a new product
  const productCode = RandomGenerator.alphaNumeric(10);
  const product = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        main_image_uri: `https://img.example.com/${RandomGenerator.alphaNumeric(8)}.jpg`,
        status: "active",
        business_status: "in_review",
        shipping_weight_grams: 250,
        shipping_length_cm: 20,
        shipping_width_cm: 15,
        shipping_height_cm: 5,
        shipping_options: "Standard Shipping",
      },
    },
  );
  typia.assert(product);

  // Seller creates an active SKU
  const skuCode = RandomGenerator.alphaNumeric(10);
  const attrValueId = typia.random<string & tags.Format<"uuid">>();
  const sku = await api.functional.shopping.seller.products.skus.create(
    connection,
    {
      productCode,
      body: {
        sku_code: skuCode,
        price: 10000,
        is_active: true,
        barcode: null,
        status: "in_stock",
        variant_attribute_value_ids: [attrValueId],
      },
    },
  );
  typia.assert(sku);

  // Customer joins and is authenticated
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: `https://shop.example.com/join/${RandomGenerator.alphaNumeric(8)}`,
      referrer: `https://shop.example.com/landing`,
      ip: null,
    },
  });
  typia.assert(customer);

  // Prepare shipping address
  const shippingAddress = {
    type: "shipping",
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    zip_code: RandomGenerator.alphaNumeric(5),
    base_address: RandomGenerator.paragraph({ sentences: 1, wordMin: 5 }),
    detail_address: "Apt 101",
    city: RandomGenerator.paragraph({ sentences: 1 }),
    state_province: "Seoul",
    country: "South Korea",
  } satisfies IShoppingOrderAddress.ICreate;

  // Order line for valid checkout
  const quantity = 1;
  const orderLine = {
    shopping_sku_id: sku.id,
    quantity,
    unit_price: sku.price,
  } satisfies IShoppingOrderLine.ICreate;
  // Total price calculation for 1 unit
  const total_price = sku.price * quantity;

  // Customer places order successfully
  const orderBody = {
    total_price,
    order_lines: [orderLine],
    shipping_addresses: [shippingAddress],
    payment_method: "card",
    coupon_code: null,
  } satisfies IShoppingOrder.ICreate;

  const order = await api.functional.shopping.customer.orders.create(
    connection,
    {
      body: orderBody,
    },
  );
  typia.assert(order);
  TestValidator.predicate(
    "order_code should be non-empty",
    order.order_code.length > 0,
  );
  TestValidator.equals(
    "total_price matches input",
    order.total_price,
    orderBody.total_price,
  );
  TestValidator.equals(
    "order_lines length matches",
    order.order_lines.length,
    1,
  );
  TestValidator.equals("sku id matches", order.order_lines[0].sku.id, sku.id);
  TestValidator.equals(
    "order address created",
    order.addresses[0].recipient_name,
    shippingAddress.recipient_name,
  );
  TestValidator.equals(
    "customer in order matches",
    order.customer.email,
    customer.email,
  );
  TestValidator.predicate(
    "initial status valid",
    ["pending", "paid"].includes(order.status),
  );
  TestValidator.predicate(
    "payment_attempts present",
    order.payment_attempts.length >= 1,
  );
  TestValidator.equals(
    "first order line unit_price",
    order.order_lines[0].unit_price,
    sku.price,
  );

  // Unauthenticated order attempt should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "order placement must be rejected for unauthenticated customer",
    async () => {
      await api.functional.shopping.customer.orders.create(unauthConn, {
        body: orderBody,
      });
    },
  );

  // Attempt to order greater quantity than inventory should fail
  const excessiveOrderLine = {
    shopping_sku_id: sku.id,
    quantity: 99999,
    unit_price: sku.price,
  } satisfies IShoppingOrderLine.ICreate;
  const excessiveOrderBody = {
    total_price: sku.price * 99999,
    order_lines: [excessiveOrderLine],
    shipping_addresses: [shippingAddress],
    payment_method: "card",
    coupon_code: null,
  } satisfies IShoppingOrder.ICreate;
  await TestValidator.error(
    "order must fail for excessive quantity",
    async () => {
      await api.functional.shopping.customer.orders.create(connection, {
        body: excessiveOrderBody,
      });
    },
  );
}
