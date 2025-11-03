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
 * Validates that a customer can retrieve details for their own order line (SKU)
 * and not others.
 *
 * This test covers:
 *
 * - Customer registration and authentication (via join)
 * - Seller registration and authentication
 * - Seller creates product and SKU
 * - Customer places order that contains at least one SKU/line item
 * - Retrieves the order line detail as the owning customer (should succeed)
 * - Attempts retrieval as another customer (should be forbidden)
 * - Attempts retrieval with a non-existent order line ID (should return not
 *   found)
 * - Checks soft-deleted status if such logic is applicable (N/A if not supported)
 * - Verifies ownership and transactional state validity on returned data
 *
 * Steps:
 *
 * 1. Register a seller and authenticate
 * 2. Seller creates a product
 * 3. Seller creates a SKU under the product (with variants if necessary)
 * 4. Register a customer and authenticate (via join, not login)
 * 5. Customer creates an order containing the seller's product and SKU
 * 6. Retrieve the order line details using order code and orderLineId (should
 *    succeed)
 * 7. Register another customer, attempt to get this order line (should be
 *    forbidden)
 * 8. Attempt to get a random/non-existent order line (should return not found)
 */
export async function test_api_customer_order_line_detail_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Register (join) a seller and authenticate
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerDisplayName = RandomGenerator.name();
  const sellerPhone = RandomGenerator.mobile();
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        display_name: sellerDisplayName,
        contact_phone: sellerPhone,
        status: "pending",
      } satisfies IShoppingSeller.IJoin,
    });
  typia.assert(seller);

  // Step 2: Seller creates a product
  const productCode = RandomGenerator.alphaNumeric(10);
  const productCreate = {
    code: productCode,
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    main_image_uri: "https://example.com/product.jpg",
    status: "active",
    business_status: "approved",
  } satisfies IShoppingProduct.ICreate;
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: productCreate,
    });
  typia.assert(product);

  // Step 3: Seller creates a SKU under the product
  const skuCode = RandomGenerator.alphaNumeric(8);
  const skuCreate = {
    sku_code: skuCode,
    price: 1500,
    is_active: true,
    barcode: RandomGenerator.alphaNumeric(13),
    status: "in_stock",
    // For variant_attribute_value_ids, we need at least one (required)
    // Use empty as we're not modeling attributes in this test - random UUID
    variant_attribute_value_ids: [typia.random<string & tags.Format<"uuid">>()],
  } satisfies IShoppingSku.ICreate;
  const sku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuCreate,
    });
  typia.assert(sku);

  // Step 4: Register and authenticate (join) a customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customerName = RandomGenerator.name();
  const customerPhone = RandomGenerator.mobile();
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword satisfies string &
          tags.MinLength<8> &
          tags.MaxLength<128>,
        name: customerName satisfies string &
          tags.MinLength<1> &
          tags.MaxLength<100>,
        phone: customerPhone satisfies string &
          tags.MinLength<7> &
          tags.MaxLength<20>,
        href: "https://shopper-site.com/register",
        referrer: "https://search-engine.com/landing",
        ip: undefined,
      } satisfies IShoppingCustomer.ICreate,
    });
  typia.assert(customer);

  // Step 5: Customer places an order with the SKU
  const shippingAddress: IShoppingOrderAddress.ICreate = {
    type: "shipping",
    recipient_name: customerName,
    recipient_phone: customerPhone,
    zip_code: "12345",
    base_address: "123 Main St",
    detail_address: "Apt 10F",
    city: "Seoul",
    state_province: "Seoul",
    country: "KOR",
  };
  const orderLine: IShoppingOrderLine.ICreate = {
    shopping_sku_id: sku.id,
    quantity: 2,
    unit_price: sku.price,
  };
  const orderCreate: IShoppingOrder.ICreate = {
    total_price: sku.price * orderLine.quantity,
    order_lines: [orderLine],
    shipping_addresses: [shippingAddress],
    payment_method: "credit_card", // this is an example string (API likely enumerates valid codes)
    coupon_code: undefined,
  };
  const order: IShoppingOrder =
    await api.functional.shopping.customer.orders.create(connection, {
      body: orderCreate,
    });
  typia.assert(order);
  TestValidator.predicate(
    "order should contain at least one line",
    order.order_lines.length > 0,
  );
  const createdOrderLine = order.order_lines[0];

  // Step 6: Retrieve order line details as the owning customer (should succeed)
  const retrieved: IShoppingOrderLine =
    await api.functional.shopping.customer.orders.lines.at(connection, {
      orderCode: order.order_code,
      orderLineId: createdOrderLine.id,
    });
  typia.assert(retrieved);
  // Field assertions: should match SKU, quantity, price, status, seller
  TestValidator.equals("sku code matches", retrieved.sku.sku_code, skuCode);
  TestValidator.equals(
    "quantity matches",
    retrieved.quantity,
    orderLine.quantity,
  );
  TestValidator.equals(
    "unit price matches",
    retrieved.unit_price,
    orderLine.unit_price,
  );
  TestValidator.equals("seller matches", retrieved.seller.id, seller.id);
  TestValidator.equals(
    "status matches",
    retrieved.status,
    createdOrderLine.status,
  );
  TestValidator.predicate(
    "deleted_at is null or undefined for active order line",
    !retrieved.deleted_at,
  );

  // Step 7: Register another customer and try to retrieve this order line (should be forbidden)
  const otherCustomer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12) satisfies string &
          tags.MinLength<8> &
          tags.MaxLength<128>,
        name: RandomGenerator.name() satisfies string &
          tags.MinLength<1> &
          tags.MaxLength<100>,
        phone: RandomGenerator.mobile() satisfies string &
          tags.MinLength<7> &
          tags.MaxLength<20>,
        href: "https://othersite.com/register",
        referrer: "https://adsite.com/landing",
        ip: undefined,
      },
    });
  typia.assert(otherCustomer);
  await TestValidator.error(
    "forbidden to access another customer's order line",
    async () => {
      await api.functional.shopping.customer.orders.lines.at(connection, {
        orderCode: order.order_code,
        orderLineId: createdOrderLine.id,
      });
    },
  );

  // Step 8: Try to retrieve a non-existent order line (should return not found)
  await TestValidator.error(
    "returns not found for non-existent order line",
    async () => {
      await api.functional.shopping.customer.orders.lines.at(connection, {
        orderCode: order.order_code,
        orderLineId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // Optional: Soft-delete logic can be checked if applicable, skipped otherwise as deletion APIs may not exist in test scope
}
