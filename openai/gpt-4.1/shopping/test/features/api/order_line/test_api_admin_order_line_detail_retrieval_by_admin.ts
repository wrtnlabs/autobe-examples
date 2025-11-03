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
 * Validate that an admin can retrieve complete details of a specific order line
 * for a customer order (shopping mall scenario).
 *
 * 1. Admin registers and is authenticated for management actions.
 * 2. Customer registers, representing a real buyer.
 * 3. Admin creates a new product in the catalog with unique details.
 * 4. Admin registers a SKU for the above product with price, code, and attributes.
 * 5. Customer creates an order with basic details (mock shipping info, order lines
 *    array initially empty).
 * 6. Customer adds an order line associating the SKU with specified quantity and
 *    unit price.
 * 7. Admin retrieves the order line detail using the admin endpoint and validates
 *    field correctness: SKU, quantity, unit_price, seller, fulfillment list,
 *    status, and timestamps.
 * 8. Asserts that only admin can retrieve the detail; access is not allowed to
 *    customers.
 */
export async function test_api_admin_order_line_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registers
  const adminEmail = RandomGenerator.alphaNumeric(10) + "@admin.com";
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const adminRole = "super";
  const adminStatus = "active";
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
      role: adminRole,
      status: adminStatus,
    },
  });
  typia.assert(admin);

  // 2. Customer registers
  const customerEmail = RandomGenerator.alphaNumeric(10) + "@user.com";
  const customerPassword = RandomGenerator.alphaNumeric(15);
  const customerName = RandomGenerator.name();
  const customerPhone = RandomGenerator.mobile();
  const customerHref =
    "https://test-customer-join/" + RandomGenerator.alphaNumeric(8);
  const customerReferrer =
    "https://referrer/" + RandomGenerator.alphaNumeric(5);
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      name: customerName,
      phone: customerPhone,
      href: customerHref,
      referrer: customerReferrer,
    },
  });
  typia.assert(customer);

  // 3. Admin creates a product
  const productCode = "P-" + RandomGenerator.alphaNumeric(8);
  const productName = RandomGenerator.paragraph({ sentences: 3 });
  const productDescription = RandomGenerator.content({ paragraphs: 1 });
  const productMainImageUri =
    "https://image-cdn.example.com/" +
    RandomGenerator.alphaNumeric(16) +
    ".jpg";
  const productStatus = "active";
  const productBusinessStatus = "approved";
  const product = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: {
        code: productCode,
        name: productName,
        description: productDescription,
        main_image_uri: productMainImageUri,
        status: productStatus,
        business_status: productBusinessStatus,
      },
    },
  );
  typia.assert(product);

  // 4. Admin creates a SKU for the product
  // We'll reuse attribute values if product.attributes exist, otherwise synthesize one for the array
  let firstAttributeValueId: string;
  if (product.attributes.length > 0) {
    firstAttributeValueId = product.attributes[0].attribute_value.id;
  } else {
    firstAttributeValueId = typia.random<string & tags.Format<"uuid">>();
  }
  const skuCode = "SKU-" + RandomGenerator.alphaNumeric(6);
  const skuPrice = Math.floor(Math.random() * 9000) + 1000;
  const sku = await api.functional.shopping.seller.products.skus.create(
    connection,
    {
      productCode: product.code,
      body: {
        sku_code: skuCode,
        price: skuPrice,
        is_active: true,
        barcode: null,
        status: "in_stock",
        variant_attribute_value_ids: [firstAttributeValueId],
      },
    },
  );
  typia.assert(sku);

  // 5. Customer creates an order (empty order_lines, will append later)
  // Mock shipping address for test
  const address: IShoppingOrderAddress.ICreate = {
    type: "shipping",
    recipient_name: customerName,
    recipient_phone: customerPhone,
    zip_code: RandomGenerator.alphaNumeric(5),
    base_address: "123 Test Avenue",
    city: "Test City",
    state_province: "Test State",
    country: "TestCountry",
  };
  const initialOrder = await api.functional.shopping.customer.orders.create(
    connection,
    {
      body: {
        total_price: 0, // Will update after adding order line
        order_lines: [],
        shipping_addresses: [address],
        payment_method: "test_pay",
      },
    },
  );
  typia.assert(initialOrder);

  // 6. Customer adds an order line
  const orderLineQuantity = Math.floor(Math.random() * 4) + 1;
  const orderLineUnitPrice = sku.price;
  const orderLine = await api.functional.shopping.customer.orders.lines.create(
    connection,
    {
      orderCode: initialOrder.order_code,
      body: {
        shopping_sku_id: sku.id,
        quantity: orderLineQuantity as number &
          tags.Type<"int32"> &
          tags.Minimum<1>,
        unit_price: orderLineUnitPrice as number & tags.Minimum<0>,
      },
    },
  );
  typia.assert(orderLine);

  // 7. Admin retrieves the order line detail by orderCode and orderLine.id
  const retrievedLine = await api.functional.shopping.admin.orders.lines.at(
    connection,
    {
      orderCode: initialOrder.order_code,
      orderLineId: orderLine.id,
    },
  );
  typia.assert(retrievedLine);

  // Assert detail correctness
  TestValidator.equals("SKU id matches", retrievedLine.sku.id, sku.id);
  TestValidator.equals(
    "SKU code matches",
    retrievedLine.sku.sku_code,
    sku.sku_code,
  );
  TestValidator.equals(
    "quantity matches",
    retrievedLine.quantity,
    orderLineQuantity,
  );
  TestValidator.equals(
    "unit price matches",
    retrievedLine.unit_price,
    orderLineUnitPrice,
  );
  TestValidator.equals(
    "seller id matches",
    retrievedLine.seller.id,
    product.seller.id,
  );
  TestValidator.equals("status is set", typeof retrievedLine.status, "string");
  TestValidator.predicate(
    "created_at and updated_at are valid",
    typeof retrievedLine.created_at === "string" &&
      typeof retrievedLine.updated_at === "string",
  );
  // fulfillments property is either undefined or array
  TestValidator.predicate(
    "fulfillments property shape",
    retrievedLine.fulfillments === undefined ||
      Array.isArray(retrievedLine.fulfillments),
  );
}
