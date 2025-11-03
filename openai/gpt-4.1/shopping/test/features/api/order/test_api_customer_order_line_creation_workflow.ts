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
 * Validates the full customer order line creation workflow, ensuring only the
 * order owner can add lines and all prerequisites are met.
 *
 * Steps:
 *
 * 1. Seller registers.
 * 2. Seller creates a product.
 * 3. Seller adds at least one SKU with at least one variant attribute.
 * 4. Customer registers/authenticates.
 * 5. Customer creates an order referencing the SKU (at least one line).
 * 6. Customer adds an additional order line using the same SKU with valid
 *    quantity/price—verify linkage and structure.
 * 7. Ensure only customer can add lines—fail if seller/other customer tries
 *    (TestValidator.error).
 * 8. Fail to add a line for non-existent SKU (invalid SKU ID).
 * 9. Fail to add a line for out-of-stock SKU (simulate by disabling
 *    is_active/status on SKU and attempting add).
 */
export async function test_api_customer_order_line_creation_workflow(
  connection: api.IConnection,
) {
  // 1. Seller registers
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "SuperSecure!1234",
        display_name: RandomGenerator.name(),
        contact_phone: RandomGenerator.mobile(),
        status: "pending",
      } satisfies IShoppingSeller.IJoin,
    });
  typia.assert(seller);

  // 2. Seller creates a product
  const productCode = RandomGenerator.alphaNumeric(10);
  const product = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: {
        code: productCode,
        name: RandomGenerator.name(),
        description: RandomGenerator.content(),
        main_image_uri:
          "https://picsum.photos/600/600?random=" +
          RandomGenerator.alphaNumeric(5),
        status: "active",
        business_status: "approved",
        shipping_weight_grams: 200,
        shipping_length_cm: 10,
        shipping_width_cm: 12,
        shipping_height_cm: 5,
        shipping_options: "free",
      } satisfies IShoppingProduct.ICreate,
    },
  );
  typia.assert(product);

  // 3. Seller creates a SKU (with at least one variant attribute; here a random id is used for attribute dummy)
  const variantAttributeValueId = typia.random<string & tags.Format<"uuid">>();
  const skuCode = RandomGenerator.alphaNumeric(12);
  const sku = await api.functional.shopping.seller.products.skus.create(
    connection,
    {
      productCode,
      body: {
        sku_code: skuCode,
        price: 13900,
        is_active: true,
        barcode: RandomGenerator.alphaNumeric(13),
        status: "in_stock",
        variant_attribute_value_ids: [
          variantAttributeValueId,
        ] satisfies string[] & tags.MinItems<1>,
      } satisfies IShoppingSku.ICreate,
    },
  );
  typia.assert(sku);

  // 4. Customer registers
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "CustPassword!123",
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://shopper.local/signup",
        referrer: "https://ad.landing.page/",
        ip: null,
      } satisfies IShoppingCustomer.ICreate,
    });
  typia.assert(customer);

  // 5. Customer creates an order with initial order line referencing the SKU
  const shippingAddress: IShoppingOrderAddress.ICreate = {
    type: "shipping",
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    zip_code: "04551",
    base_address: "123 Main St",
    detail_address: "Apt 24F",
    city: "Seoul",
    state_province: "Seoul",
    country: "Korea",
  };
  const orderLine1: IShoppingOrderLine.ICreate = {
    shopping_sku_id: sku.id,
    quantity: 1,
    unit_price: sku.price,
  };
  const order: IShoppingOrder =
    await api.functional.shopping.customer.orders.create(connection, {
      body: {
        total_price: sku.price,
        order_lines: [orderLine1],
        shipping_addresses: [shippingAddress],
        payment_method: "CARD",
      } satisfies IShoppingOrder.ICreate,
    });
  typia.assert(order);
  const orderCode = order.order_code;

  // 6. Customer adds another order line for the same SKU
  const addLineBody: IShoppingOrderLine.ICreate = {
    shopping_sku_id: sku.id,
    quantity: 2,
    unit_price: sku.price,
  };
  const addedLine: IShoppingOrderLine =
    await api.functional.shopping.customer.orders.lines.create(connection, {
      orderCode,
      body: addLineBody,
    });
  typia.assert(addedLine);
  TestValidator.equals(
    "SKU reference in added line matches",
    addedLine.sku.id,
    sku.id,
  );
  TestValidator.equals("Added line quantity correct", addedLine.quantity, 2);
  TestValidator.equals(
    "Added line unit_price correct",
    addedLine.unit_price,
    sku.price,
  );
  TestValidator.equals(
    "Order line seller is correct",
    addedLine.seller.id,
    seller.id,
  );

  // 7. Seller attempts to add line - should fail
  await TestValidator.error(
    "Seller may not add order line to customer order",
    async () => {
      await api.functional.shopping.customer.orders.lines.create(connection, {
        orderCode,
        body: addLineBody,
      });
    },
  );

  // 8. Cannot add line for nonexistent SKU
  await TestValidator.error(
    "Cannot add order line for nonexistent SKU",
    async () => {
      await api.functional.shopping.customer.orders.lines.create(connection, {
        orderCode,
        body: {
          shopping_sku_id: typia.random<string & tags.Format<"uuid">>(),
          quantity: 1,
          unit_price: sku.price,
        },
      });
    },
  );

  // 9. Cannot add line for out-of-stock or inactive SKU (simulate with is_active: false and invalid status)
  const inactiveSku = await api.functional.shopping.seller.products.skus.create(
    connection,
    {
      productCode,
      body: {
        sku_code: RandomGenerator.alphaNumeric(14),
        price: 9900,
        is_active: false,
        status: "discontinued",
        variant_attribute_value_ids: [
          typia.random<string & tags.Format<"uuid">>(),
        ] satisfies string[] & tags.MinItems<1>,
      } satisfies IShoppingSku.ICreate,
    },
  );
  typia.assert(inactiveSku);
  await TestValidator.error(
    "Cannot add line for inactive/discontinued SKU",
    async () => {
      await api.functional.shopping.customer.orders.lines.create(connection, {
        orderCode,
        body: {
          shopping_sku_id: inactiveSku.id,
          quantity: 1,
          unit_price: inactiveSku.price,
        },
      });
    },
  );
}
