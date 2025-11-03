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
 * Verifies a customer can fetch all details for their own orders.
 *
 * Steps:
 *
 * 1. Register customer A
 * 2. Register customer B
 * 3. As seller: create a product
 * 4. As seller: create a SKU for that product
 * 5. As customer A: create an order that references the SKU
 * 6. Fetch the order via GET /shopping/customer/orders/{order_code} as customer A
 *
 *    - Assert all join fields (lines, shipments, addresses, etc.) are present and
 *         correct
 * 7. As customer B: attempt to GET the same order (expect forbidden or error)
 */
export async function test_api_customer_order_detail_self_access(
  connection: api.IConnection,
) {
  // 1. Register customer A
  const customerAEmail = typia.random<string & tags.Format<"email">>();
  const customerAPassword = RandomGenerator.alphabets(10);
  const customerA: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerAEmail,
        password: customerAPassword satisfies string as string,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://shop.test/joinA",
        referrer: "https://shop.test/landingA",
      } satisfies IShoppingCustomer.ICreate,
    });
  typia.assert(customerA);

  // 2. Register customer B
  const customerBEmail = typia.random<string & tags.Format<"email">>();
  const customerBPassword = RandomGenerator.alphabets(10);
  const customerB: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerBEmail,
        password: customerBPassword satisfies string as string,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://shop.test/joinB",
        referrer: "https://shop.test/landingB",
      } satisfies IShoppingCustomer.ICreate,
    });
  typia.assert(customerB);

  // 3. As seller, create product
  // For this test, we use the already-authenticated customer context, since there is no seller API for account join
  // Generate a unique product code for test repeatability
  const productCode = RandomGenerator.alphaNumeric(12);
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        main_image_uri: "https://image.test/prod-main.jpg",
        status: "active",
        business_status: "in_review", // For this test, in_review
      } satisfies IShoppingProduct.ICreate,
    });
  typia.assert(product);

  // 4. As seller, create SKU for product
  const skuCode = RandomGenerator.alphaNumeric(16);
  // Satisfy the only required field: variant_attribute_value_ids: string[] (at least one entry)
  // For simplicity as no attributes exist yet, just create a fake/unique id
  const sku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: product.code,
      body: {
        sku_code: skuCode,
        price: 1000,
        is_active: true,
        barcode: RandomGenerator.alphaNumeric(13),
        status: "in_stock",
        variant_attribute_value_ids: [
          typia.random<string & tags.Format<"uuid">>(),
        ],
      } satisfies IShoppingSku.ICreate,
    });
  typia.assert(sku);

  // 5. As customer A: create order referencing that SKU
  // Compute total_price = price * quantity (set to 1 for simplicity)
  const orderLine = {
    shopping_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    unit_price: sku.price as number & tags.Minimum<0>,
  } satisfies IShoppingOrderLine.ICreate;

  const shippingAddress = {
    type: "shipping",
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    zip_code: RandomGenerator.alphaNumeric(5),
    base_address: RandomGenerator.paragraph({ sentences: 2 }),
    detail_address: RandomGenerator.paragraph({ sentences: 1 }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    country: "Korea",
  } satisfies IShoppingOrderAddress.ICreate;

  const orderBody = {
    total_price: sku.price,
    order_lines: [orderLine],
    shipping_addresses: [shippingAddress],
    payment_method: "test_card",
    coupon_code: null,
  } satisfies IShoppingOrder.ICreate;

  const order: IShoppingOrder =
    await api.functional.shopping.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 6. As customer A, GET order detail by code
  const reloaded: IShoppingOrder =
    await api.functional.shopping.customer.orders.at(connection, {
      orderCode: order.order_code,
    });
  typia.assert(reloaded);

  // Confirm order fields
  TestValidator.equals("order basic fields: id", reloaded.id, order.id);
  TestValidator.equals(
    "order basic fields: order_code",
    reloaded.order_code,
    order.order_code,
  );
  TestValidator.equals(
    "order basic fields: total_price",
    reloaded.total_price,
    sku.price,
  );
  TestValidator.equals(
    "order has order lines",
    Array.isArray(reloaded.order_lines) && reloaded.order_lines.length > 0,
    true,
  );
  TestValidator.equals(
    "order has addresses",
    Array.isArray(reloaded.addresses) && reloaded.addresses.length > 0,
    true,
  );
  TestValidator.equals(
    "order has status_history",
    Array.isArray(reloaded.status_history),
    true,
  );
  TestValidator.equals(
    "order has payment_attempts",
    Array.isArray(reloaded.payment_attempts),
    true,
  );
  TestValidator.equals(
    "order has shipments",
    Array.isArray(reloaded.shipments),
    true,
  );

  // Check order lines reference the correct SKU/Seller
  TestValidator.equals(
    "order line has correct sku reference",
    reloaded.order_lines[0].sku.id,
    sku.id,
  );
  TestValidator.equals(
    "order line has correct seller reference",
    reloaded.order_lines[0].seller.id,
    product.seller.id,
  );

  // 7. As customer B, try to GET the same order (should fail)
  // Switch to customer B's token (api SDK manages this after join)
  await api.functional.auth.customer.join(connection, {
    body: {
      email: customerBEmail,
      password: customerBPassword satisfies string as string,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://shop.test/b-reauth",
      referrer: "https://shop.test/landingB2",
    } satisfies IShoppingCustomer.ICreate,
  });
  await TestValidator.error(
    "unauthorized access to another customer's order is denied",
    async () => {
      await api.functional.shopping.customer.orders.at(connection, {
        orderCode: order.order_code,
      });
    },
  );
}
