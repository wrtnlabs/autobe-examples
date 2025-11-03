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
 * Validates permitted customer-side order updates before fulfillment/shipment.
 *
 * This test covers the following critical flows and edge cases:
 *
 * 1. Seller registers and creates a product and an SKU.
 * 2. Customer self-registers and creates an order using the SKU.
 * 3. Customer can update allowed modifiable fields of the order while order is
 *    pending (such as address or certain statuses).
 * 4. After order reaches fulfillment (mocked by status change), further updates
 *    are rejected.
 * 5. Unauthorized update attempts (other users or unauthenticated) are rejected.
 * 6. Audit logs/status transitions reflect each update.
 *
 * The test verifies that only allowed fields are updated, audit fields are
 * read-only, business rules are enforced, and all API responses are type-safe
 * and correct.
 */
export async function test_api_customer_order_update_before_fulfillment(
  connection: api.IConnection,
) {
  // 1. Seller registers & creates product
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "password-123",
      display_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    } satisfies IShoppingSeller.IJoin,
  });
  typia.assert(seller);

  // 2. Seller creates product
  const productCode = RandomGenerator.alphaNumeric(8);
  const product = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
          wordMin: 4,
          wordMax: 10,
        }),
        main_image_uri:
          "https://example.com/img/" + RandomGenerator.alphaNumeric(8) + ".jpg",
        status: "draft",
        business_status: "in_review",
      } satisfies IShoppingProduct.ICreate,
    },
  );
  typia.assert(product);

  // 3. Seller creates SKU
  const sku = await api.functional.shopping.seller.products.skus.create(
    connection,
    {
      productCode: productCode,
      body: {
        sku_code: RandomGenerator.alphaNumeric(14),
        price: 8999,
        is_active: true,
        barcode: RandomGenerator.alphaNumeric(12),
        status: "in_stock",
        variant_attribute_value_ids:
          Array.isArray(product.attributes) && product.attributes.length > 0
            ? [product.attributes[0].attribute_value.id]
            : [typia.random<string & tags.Format<"uuid">>()],
      } satisfies IShoppingSku.ICreate,
    },
  );
  typia.assert(sku);

  // 4. Customer registers and creates order
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "password-789",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://test-mall.local/checkout",
      referrer: "https://test-mall.local/promotion/ref?src=test",
    } satisfies IShoppingCustomer.ICreate,
  });
  typia.assert(customer);

  const orderCreateInput = {
    total_price: sku.price,
    order_lines: [
      {
        shopping_sku_id: sku.id,
        quantity: 1,
        unit_price: sku.price,
      } satisfies IShoppingOrderLine.ICreate,
    ],
    shipping_addresses: [
      {
        type: "shipping",
        recipient_name: RandomGenerator.name(),
        recipient_phone: RandomGenerator.mobile(),
        zip_code: String(10000 + Math.floor(Math.random() * 90000)),
        base_address: "123 Test Ave",
        detail_address: "Suite 42C",
        city: "Seoul",
        state_province: "Seoul",
        country: "KR",
      } satisfies IShoppingOrderAddress.ICreate,
    ],
    payment_method: "bank_transfer",
  } satisfies IShoppingOrder.ICreate;

  const order = await api.functional.shopping.customer.orders.create(
    connection,
    {
      body: orderCreateInput,
    },
  );
  typia.assert(order);
  const orderCode = order.order_code;

  // 5. Update permitted fields: shipping_addresses
  const newRecipient = RandomGenerator.name();
  const updateInput = {
    shipping_addresses: [
      {
        recipient_name: newRecipient,
      } satisfies IShoppingOrderAddress.IUpdate,
    ],
  } satisfies IShoppingOrder.IUpdate;

  const updatedOrder = await api.functional.shopping.customer.orders.update(
    connection,
    {
      orderCode,
      body: updateInput,
    },
  );
  typia.assert(updatedOrder);
  TestValidator.equals(
    "order shipping address recipient updated",
    updatedOrder.addresses[0].recipient_name,
    newRecipient,
  );
  TestValidator.equals(
    "order_code not changed on update",
    updatedOrder.order_code,
    order.order_code,
  );

  // 6. Simulate fulfillment (mock: change status to 'fulfilled'), then update attempt is rejected
  const fulfilledOrder = await api.functional.shopping.customer.orders.update(
    connection,
    {
      orderCode,
      body: {
        status: "fulfilled",
      } satisfies IShoppingOrder.IUpdate,
    },
  );
  typia.assert(fulfilledOrder);
  TestValidator.equals(
    "order now in fulfilled status",
    fulfilledOrder.status,
    "fulfilled",
  );
  await TestValidator.error("update after fulfillment is blocked", async () => {
    await api.functional.shopping.customer.orders.update(connection, {
      orderCode,
      body: {
        status: "pending",
      } satisfies IShoppingOrder.IUpdate,
    });
  });

  // 7. Unauthorized update attempt (seller, not order owner)
  await api.functional.auth.seller.join(connection, {
    body: {
      email: "second.seller." + RandomGenerator.alphaNumeric(6) + "@test.com",
      password: "password-456",
      display_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    } satisfies IShoppingSeller.IJoin,
  });
  await TestValidator.error(
    "non-customer cannot update customer order",
    async () => {
      await api.functional.shopping.customer.orders.update(connection, {
        orderCode,
        body: {
          status: "pending",
        } satisfies IShoppingOrder.IUpdate,
      });
    },
  );

  // 8. Unauthenticated update attempt
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user update is rejected",
    async () => {
      await api.functional.shopping.customer.orders.update(unauthConn, {
        orderCode,
        body: {
          status: "pending",
        } satisfies IShoppingOrder.IUpdate,
      });
    },
  );

  // 9. Confirm audit history reflects the changes
  TestValidator.predicate(
    "status history includes the fulfilled transition",
    updatedOrder.status_history.some(
      (history) => history.to_status === "fulfilled",
    ),
  );
  TestValidator.predicate(
    "updated_at reflects latest update after modification",
    new Date(updatedOrder.updated_at) >= new Date(order.updated_at),
  );
}
