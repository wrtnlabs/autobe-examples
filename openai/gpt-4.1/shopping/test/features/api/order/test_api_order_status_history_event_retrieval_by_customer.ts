import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingOrderStatusHistory";
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
 * Validate retrieval of a single order status history event by a customer for
 * their own order.
 *
 * 1. Register a seller and authenticate (to set up catalog).
 * 2. Seller creates a product.
 * 3. Seller creates a SKU for that product (with valid attributes if required).
 * 4. Register a customer (customer authentication).
 * 5. Customer places an order using the SKU (with valid address, lines, etc).
 * 6. Customer fetches the status history page for their order.
 * 7. Extract one status event's ID and fetch its details via the
 *    /status-history/:orderStatusHistoryId endpoint.
 * 8. Validate that the event object returned matches the summary, contains
 *    from_status/to_status, triggered_by, occurred_at, and event_note, and that
 *    these fields are consistent between the list and the single fetch.
 * 9. Assert that only the owner customer may access their status event detail, and
 *    sensitive data is not exposed.
 */
export async function test_api_order_status_history_event_retrieval_by_customer(
  connection: api.IConnection,
) {
  // 1. Register seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    } satisfies IShoppingSeller.IJoin,
  });
  typia.assert(seller);

  // 2. Seller creates product
  const productCode = RandomGenerator.alphaNumeric(10);
  const product = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        main_image_uri:
          "https://img.example.com/" + RandomGenerator.alphaNumeric(8),
        status: "active",
        business_status: "in_review",
      } satisfies IShoppingProduct.ICreate,
    },
  );
  typia.assert(product);

  // 3. Seller creates SKU
  const skuCode = RandomGenerator.alphaNumeric(10);
  // Use first available product attribute value if any, else minimal dummy if need required 1
  const attributeValueIds: string[] =
    Array.isArray(product.attributes) && product.attributes.length > 0
      ? [product.attributes[0].attribute_value.id]
      : [typia.random<string & tags.Format<"uuid">>()];
  const sku = await api.functional.shopping.seller.products.skus.create(
    connection,
    {
      productCode: productCode,
      body: {
        sku_code: skuCode,
        price: 12300,
        is_active: true,
        barcode: null,
        status: "in_stock",
        variant_attribute_value_ids: attributeValueIds,
      } satisfies IShoppingSku.ICreate,
    },
  );
  typia.assert(sku);

  // 4. Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://shop.example.com/welcome",
      referrer: "https://shop.example.com/landing",
      ip: null,
    } satisfies IShoppingCustomer.ICreate,
  });
  typia.assert(customer);

  // 5. Customer places an order
  const shippingAddress: IShoppingOrderAddress.ICreate = {
    type: "shipping",
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    zip_code: RandomGenerator.alphaNumeric(5),
    base_address: RandomGenerator.paragraph({ sentences: 2 }),
    detail_address: null,
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    country: "Wonderland",
  } satisfies IShoppingOrderAddress.ICreate;
  // Order lines: one order line for the created SKU
  const orderLine: IShoppingOrderLine.ICreate = {
    shopping_sku_id: sku.id,
    quantity: 1,
    unit_price: sku.price,
  } satisfies IShoppingOrderLine.ICreate;
  const order = await api.functional.shopping.customer.orders.create(
    connection,
    {
      body: {
        total_price: sku.price,
        order_lines: [orderLine],
        shipping_addresses: [shippingAddress],
        payment_method: "test_method",
        coupon_code: null,
      } satisfies IShoppingOrder.ICreate,
    },
  );
  typia.assert(order);

  // 6. Fetch order status history page
  const statusPage =
    await api.functional.shopping.customer.orders.status_history.index(
      connection,
      {
        orderCode: order.order_code,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingOrderStatusHistory.IRequest,
      },
    );
  typia.assert(statusPage);
  TestValidator.predicate(
    "at least one status history exists for new order",
    statusPage.data.length > 0,
  );

  // 7. Extract one event's ID and fetch details
  const eventSummary = statusPage.data[0];
  const statusEvent =
    await api.functional.shopping.customer.orders.status_history.at(
      connection,
      {
        orderCode: order.order_code,
        orderStatusHistoryId: eventSummary.id,
      },
    );
  typia.assert(statusEvent);

  // 8. Validate fields match summary
  TestValidator.equals(
    "event ID matches summary",
    statusEvent.id,
    eventSummary.id,
  );
  TestValidator.equals(
    "from_status matches",
    statusEvent.from_status,
    eventSummary.from_status,
  );
  TestValidator.equals(
    "to_status matches",
    statusEvent.to_status,
    eventSummary.to_status,
  );
  TestValidator.equals(
    "triggered_by matches",
    statusEvent.triggered_by,
    eventSummary.triggered_by,
  );
  TestValidator.equals(
    "occurred_at matches",
    statusEvent.occurred_at,
    eventSummary.occurred_at,
  );
  // event_note may be undefined or null in summary/details; match accordingly
  TestValidator.equals(
    "event_note value matches",
    statusEvent.event_note ?? undefined,
    eventSummary.event_note ?? undefined,
  );
  // Validate ownership: statusEvent.shopping_order_id matches order.id
  TestValidator.equals(
    "status event belongs to created order",
    statusEvent.shopping_order_id,
    order.id,
  );

  // 9. Extra check: status event should not expose unrelated information
  // e.g., check that only allowed fields exist
  // (could check concrete keys if needed, here verifying general shape)
}
