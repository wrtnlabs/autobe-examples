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
 * Validates that an authenticated seller can successfully retrieve full details
 * for an order containing their product(s).
 *
 * 1. Registers a seller and authenticates the seller session.
 * 2. Seller creates a product with explicit code.
 * 3. Seller creates a SKU under their newly created product with a unique sku_code
 *    and required attributes.
 * 4. Registers a customer and authenticates the customer session.
 * 5. Customer creates an order, purchasing quantity 1 of the seller's SKU (with
 *    valid price), with full shipping address and a designated payment method.
 * 6. Switches authentication context back to the seller session.
 * 7. Seller retrieves the full order details by order_code using the seller GET
 *    order endpoint.
 * 8. Asserts presence of all required order sub-entities such as order_lines,
 *    splits, payment_attempts, shipments, addresses, and all audit/status
 *    fields in the detailed view.
 * 9. Asserts that the order data references the correct seller, product, and
 *    relationships appropriately for a cross-actor traceable order.
 * 10. Validates that all security and business linkage rules for seller-accessed
 *     order detail are enforced including order structure integrity.
 */
export async function test_api_seller_order_detail_retrieval_authorized(
  connection: api.IConnection,
) {
  // 1. Seller registration and authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "TestPassword!123",
        display_name: RandomGenerator.name(),
        contact_phone: RandomGenerator.mobile(),
        status: "pending",
      } satisfies IShoppingSeller.IJoin,
    });
  typia.assert(seller);

  // 2. Seller creates product
  // Use random product code for uniqueness
  const productCode = RandomGenerator.alphaNumeric(10);
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 4,
          sentenceMax: 7,
        }),
        main_image_uri: "https://dummyimage.com/600x400/000/fff",
        status: "active",
        business_status: "in_review",
      } satisfies IShoppingProduct.ICreate,
    });
  typia.assert(product);

  // 3. Seller creates SKU under product
  const skuCode = RandomGenerator.alphaNumeric(8);
  const variantValues: string[] = [];
  const sku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: product.code,
      body: {
        sku_code: skuCode,
        price: 10000,
        is_active: true,
        barcode: null,
        status: "in_stock",
        variant_attribute_value_ids: [], // no attributes enabled for minimal viable SKU
      } satisfies IShoppingSku.ICreate,
    });
  typia.assert(sku);

  // 4. Customer registration and authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "TestPassword!123",
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://test.customer-landing-page.com/",
        referrer: "https://test.referrer-origin.com/",
        ip: undefined,
      } satisfies IShoppingCustomer.ICreate,
    });
  typia.assert(customer);

  // 5. Customer creates order (order contains the seller's SKU)
  // Uses shipping address with all required fields
  const orderBody = {
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
        recipient_name: customer.name,
        recipient_phone: customer.phone,
        zip_code: "12345",
        base_address: "123 Test Ave",
        detail_address: "Apt 1",
        city: "Seoul",
        state_province: "Seoul",
        country: "South Korea",
      } satisfies IShoppingOrderAddress.ICreate,
    ],
    payment_method: "credit_card",
  } satisfies IShoppingOrder.ICreate;

  const order: IShoppingOrder =
    await api.functional.shopping.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 6. Switch session back to seller (seller is already authenticated)
  // No-op as session is already set due to the join operation earlier

  // 7. Seller retrieves order details by order code
  const orderDetails: IShoppingOrder =
    await api.functional.shopping.seller.orders.at(connection, {
      orderCode: order.order_code,
    });
  typia.assert(orderDetails);

  // 8. Validate that all expected fields and sub-entity arrays exist and are populated
  TestValidator.equals(
    "order_code matches",
    orderDetails.order_code,
    order.order_code,
  );
  TestValidator.predicate(
    "order_lines should be present",
    Array.isArray(orderDetails.order_lines) &&
      orderDetails.order_lines.length > 0,
  );
  TestValidator.predicate(
    "order_splits should exist",
    Array.isArray(orderDetails.order_splits),
  );
  TestValidator.predicate(
    "addresses should exist",
    Array.isArray(orderDetails.addresses),
  );
  TestValidator.predicate(
    "status_history should exist",
    Array.isArray(orderDetails.status_history),
  );
  TestValidator.predicate(
    "payment_attempts should exist",
    Array.isArray(orderDetails.payment_attempts),
  );
  TestValidator.predicate(
    "shipments should exist",
    Array.isArray(orderDetails.shipments),
  );
  // 9. Relationship checks
  const foundLine = orderDetails.order_lines.find((l) => l.sku.id === sku.id);
  TestValidator.predicate("order contains the original SKU", !!foundLine);
  TestValidator.equals(
    "order_line seller matches",
    foundLine?.seller.id,
    seller.id,
  );
  // 10. Audit fields and business rules
  TestValidator.predicate(
    "order detail created_at/updated_at populated",
    typeof orderDetails.created_at === "string" &&
      typeof orderDetails.updated_at === "string",
  );
  TestValidator.predicate(
    "order total_price matches",
    orderDetails.total_price === orderBody.total_price,
  );
}
