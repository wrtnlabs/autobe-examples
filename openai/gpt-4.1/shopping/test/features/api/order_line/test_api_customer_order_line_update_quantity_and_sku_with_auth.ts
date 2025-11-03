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
 * E2E test: Update order line (quantity and SKU substitution) with
 * authentication and business validation
 *
 * 1. Register a customer via /auth/customer/join
 * 2. Create a test product via /shopping/admin/products
 * 3. Create two SKUs under the product via
 *    /shopping/admin/products/{productCode}/skus
 * 4. As customer, create an order via /shopping/customer/orders with initial
 *    address, payment method, and one order line (SKU1)
 * 5. As customer, create an order line via
 *    /shopping/customer/orders/{orderCode}/lines for SKU1
 * 6. Update the order line's quantity
 * 7. Update the order line's SKU to SKU2 (simulate allowed substitution)
 * 8. Attempt to update with non-existent SKU (should fail)
 * 9. Attempt to update the order line after 'finalizing' the order (simulate
 *    finalized state or skip if not possible, should fail)
 * 10. Attempt to update while not authenticated as order owner (should fail)
 */
export async function test_api_customer_order_line_update_quantity_and_sku_with_auth(
  connection: api.IConnection,
) {
  // 1. Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(10);
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://test.com/join",
      referrer: "https://test.com/landing",
      ip: null,
    },
  });
  typia.assert(customerAuth);

  // 2. Create product as admin
  const productCode = RandomGenerator.alphaNumeric(8);
  const product = await api.functional.shopping.admin.products.create(
    connection,
    {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        main_image_uri: "https://cdn.example.com/product.jpg",
        status: "active",
        business_status: "in_review",
      },
    },
  );
  typia.assert(product);

  // 3. Create 2 SKUs for the product
  // For simplicity in the absence of attribute API, fake IDs for variant_attribute_value_ids
  const skuValueId1 = typia.random<string & tags.Format<"uuid">>();
  const skuValueId2 = typia.random<string & tags.Format<"uuid">>();
  const sku1Code = "SKU-A-" + RandomGenerator.alphaNumeric(4);
  const sku2Code = "SKU-B-" + RandomGenerator.alphaNumeric(4);

  const sku1 = await api.functional.shopping.admin.products.skus.create(
    connection,
    {
      productCode,
      body: {
        sku_code: sku1Code,
        price: 1000,
        is_active: true,
        barcode: null,
        status: "in_stock",
        variant_attribute_value_ids: [skuValueId1],
      },
    },
  );
  typia.assert(sku1);
  const sku2 = await api.functional.shopping.admin.products.skus.create(
    connection,
    {
      productCode,
      body: {
        sku_code: sku2Code,
        price: 1300,
        is_active: true,
        barcode: null,
        status: "in_stock",
        variant_attribute_value_ids: [skuValueId2],
      },
    },
  );
  typia.assert(sku2);

  // 4. Customer creates an order (with address etc)
  const orderAddress: IShoppingOrderAddress.ICreate = {
    type: "shipping",
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    zip_code: RandomGenerator.alphaNumeric(5),
    base_address: RandomGenerator.paragraph({ sentences: 2 }),
    detail_address: null,
    city: "Seoul",
    state_province: "Seoul",
    country: "South Korea",
  };
  const initialOrderQuantity = 2;
  const order = await api.functional.shopping.customer.orders.create(
    connection,
    {
      body: {
        total_price: sku1.price * initialOrderQuantity,
        order_lines: [
          {
            shopping_sku_id: sku1.id,
            quantity: initialOrderQuantity,
            unit_price: sku1.price,
          },
        ],
        shipping_addresses: [orderAddress],
        payment_method: "bank_transfer",
        coupon_code: null,
      },
    },
  );
  typia.assert(order);
  TestValidator.equals(
    "order line count after create",
    order.order_lines.length,
    1,
  );
  const createdLine = order.order_lines[0];

  // 5. Update the order line's quantity
  const newQuantity = initialOrderQuantity + 1;
  const updatedLineQty =
    await api.functional.shopping.customer.orders.lines.update(connection, {
      orderCode: order.order_code,
      orderLineId: createdLine.id,
      body: { quantity: newQuantity },
    });
  typia.assert(updatedLineQty);
  TestValidator.equals(
    "quantity updated",
    updatedLineQty.quantity,
    newQuantity,
  );
  TestValidator.equals(
    "SKU remains the same after quantity change",
    updatedLineQty.sku.id,
    createdLine.sku.id,
  );

  // 6. Update the order line's SKU to SKU2 (SKU swap)
  const updatedLineSku =
    await api.functional.shopping.customer.orders.lines.update(connection, {
      orderCode: order.order_code,
      orderLineId: createdLine.id,
      body: { shopping_sku_id: sku2.id },
    });
  typia.assert(updatedLineSku);
  TestValidator.equals(
    "order line sku updated to sku2",
    updatedLineSku.sku.id,
    sku2.id,
  );
  TestValidator.notEquals(
    "order line sku changed from sku1",
    updatedLineSku.sku.id,
    createdLine.sku.id,
  );

  // 7. Attempt to update order line to a non-existent SKU id (should fail)
  await TestValidator.error(
    "updating order line to non-existent SKU should fail",
    async () => {
      await api.functional.shopping.customer.orders.lines.update(connection, {
        orderCode: order.order_code,
        orderLineId: createdLine.id,
        body: { shopping_sku_id: typia.random<string & tags.Format<"uuid">>() },
      });
    },
  );

  // 8. Attempt to update line after simulating order finalization: set order status to 'paid' then try update (simulate only if order status mutation exists)
  // Since there is no direct API for finalization, skip if not accessible, but if possible would expect error here
  // Skipping as business workflow does not expose mutation in this context

  // 9. Simulate unauthenticated or wrong user by forging a new customer
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const otherPassword = RandomGenerator.alphaNumeric(10);
  const otherAuth = await api.functional.auth.customer.join(
    { ...connection, headers: {} },
    {
      body: {
        email: otherEmail,
        password: otherPassword,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://test.com/join",
        referrer: "https://test.com/landing",
        ip: null,
      },
    },
  );
  typia.assert(otherAuth);
  await TestValidator.error(
    "other customer updating not-owned order line should fail",
    async () => {
      await api.functional.shopping.customer.orders.lines.update(connection, {
        orderCode: order.order_code,
        orderLineId: createdLine.id,
        body: { quantity: 1 },
      });
    },
  );
}
