import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
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
 * Test that an admin can successfully update an order line item's quantity, SKU
 * (if allowed), or price when the order is still open and modifiable. Confirm
 * that the update is applied and reflected in the order line's details. The
 * workflow requires authentication as admin, creation of a product and SKU, an
 * order and order line to target, and finally, updating the order line item
 * through the endpoint.
 */
export async function test_api_admin_update_order_line_item_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        role: "super",
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Register a new seller and authenticate
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        contact_phone: RandomGenerator.mobile(),
        status: "pending",
      } satisfies IShoppingSeller.IJoin,
    });
  typia.assert(seller);

  // 3. Create a product as seller
  const productCode = RandomGenerator.alphaNumeric(10);
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        main_image_uri: `https://picsum.photos/seed/${productCode}/640/480`,
        status: "active",
        business_status: "approved",
        shipping_weight_grams: 1000,
        shipping_length_cm: 30,
        shipping_width_cm: 20,
        shipping_height_cm: 10,
        shipping_options: "standard,express",
      } satisfies IShoppingProduct.ICreate,
    });
  typia.assert(product);

  // 4. Add a SKU for this product as seller
  const skuCode = RandomGenerator.alphaNumeric(10);
  const sku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: productCode,
      body: {
        sku_code: skuCode,
        price: 10000,
        is_active: true,
        barcode: RandomGenerator.alphaNumeric(13),
        status: "in_stock",
        variant_attribute_value_ids: [], // Provide at least one if required (MinItems<1>), else empty
      } satisfies IShoppingSku.ICreate,
    });
  typia.assert(sku);

  // 5. Register a customer and authenticate
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: `https://shop.example.com/join/${RandomGenerator.alphaNumeric(5)}`,
        referrer: `https://shop.example.com/welcome`,
      } satisfies IShoppingCustomer.ICreate,
    });
  typia.assert(customer);

  // 6. Create a new order with an order line (as customer)
  const shippingAddress: IShoppingOrderAddress.ICreate = {
    type: "shipping",
    recipient_name: customer.name,
    recipient_phone: customer.phone,
    zip_code: RandomGenerator.alphaNumeric(5),
    base_address: "123 Test St",
    city: "Seoul",
    state_province: "Seoul",
    country: "South Korea",
  } satisfies IShoppingOrderAddress.ICreate;
  const order: IShoppingOrder =
    await api.functional.shopping.customer.orders.create(connection, {
      body: {
        total_price: sku.price,
        order_lines: [
          {
            shopping_sku_id: sku.id,
            quantity: 1,
            unit_price: sku.price,
          },
        ],
        shipping_addresses: [shippingAddress],
        payment_method: "card",
      } satisfies IShoppingOrder.ICreate,
    });
  typia.assert(order);

  // 7. Add a new order line (simulate multiple lines, as extra test)
  const secondOrderLineSkuCode = RandomGenerator.alphaNumeric(10);
  const secondSku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: productCode,
      body: {
        sku_code: secondOrderLineSkuCode,
        price: 8000,
        is_active: true,
        barcode: RandomGenerator.alphaNumeric(13),
        status: "in_stock",
        variant_attribute_value_ids: [], // Provide at least one if required (MinItems<1>), else empty
      } satisfies IShoppingSku.ICreate,
    });
  typia.assert(secondSku);

  const secondOrderLine: IShoppingOrderLine =
    await api.functional.shopping.customer.orders.lines.create(connection, {
      orderCode: order.order_code,
      body: {
        shopping_sku_id: secondSku.id,
        quantity: 2,
        unit_price: secondSku.price,
      } satisfies IShoppingOrderLine.ICreate,
    });
  typia.assert(secondOrderLine);

  // 8. Update the first order line as admin: change quantity and price (and optionally SKU)
  const targetOrderLine = order.order_lines[0];
  const updatedQuantity = 5;
  const updatedUnitPrice = sku.price + 1500;
  const updateResult: IShoppingOrderLine =
    await api.functional.shopping.admin.orders.lines.update(connection, {
      orderCode: order.order_code,
      orderLineId: targetOrderLine.id,
      body: {
        quantity: updatedQuantity,
        unit_price: updatedUnitPrice,
      } satisfies IShoppingOrderLine.IUpdate,
    });
  typia.assert(updateResult);

  // 9. Validate response reflects updated data
  TestValidator.equals(
    "updated order line ID matches original",
    updateResult.id,
    targetOrderLine.id,
  );
  TestValidator.equals(
    "quantity correctly updated",
    updateResult.quantity,
    updatedQuantity,
  );
  TestValidator.equals(
    "unit price correctly updated",
    updateResult.unit_price,
    updatedUnitPrice,
  );
  // Validate SKU reference unchanged if not set, or update as business allows
  TestValidator.equals("SKU remains unchanged", updateResult.sku.id, sku.id);
}
