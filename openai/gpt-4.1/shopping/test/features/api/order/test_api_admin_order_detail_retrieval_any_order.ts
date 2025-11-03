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
 * This test verifies that an admin can retrieve the full details of any order
 * in the system, regardless of order ownership or status. The scenario ensures
 * that admin permissions provide comprehensive visibility into all aspects of
 * an order—including order lines, splits, payment attempts, shipments,
 * addresses, and audit history—thus supporting compliance requirements and
 * troubleshooting workflows.
 *
 * Test Workflow:
 *
 * 1. Authenticate as an admin to obtain admin privileges.
 * 2. Register a seller account and create a product.
 * 3. Under the seller, create a valid SKU for the product.
 * 4. Register a customer account.
 * 5. Place a customer order with the seller's SKU and valid order data, ensuring
 *    the order is created in the system.
 * 6. Use admin privileges to retrieve the order using its order_code.
 * 7. Validate that the retrieved order includes all required sections (lines,
 *    splits, payment attempts, shipments, addresses, audit history), and that
 *    order_code matches.
 *
 * This test covers both business logic and permission aspects: order must be
 * visible to admin actors regardless of its creator or status, and all
 * relational data must be accessible for audit and support purposes.
 */
export async function test_api_admin_order_detail_retrieval_any_order(
  connection: api.IConnection,
) {
  // 1. Register/admin join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        role: "super",
        status: "active",
      },
    });
  typia.assert(admin);

  // 2. Register a seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(14);
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        display_name: RandomGenerator.name(),
        contact_phone: RandomGenerator.mobile(),
        status: "pending",
      },
    });
  typia.assert(seller);

  // 3. Seller creates a product
  const productCode = RandomGenerator.alphaNumeric(12);
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 8,
          sentenceMax: 15,
        }),
        main_image_uri: "https://picsum.photos/200",
        status: "draft",
        business_status: "in_review",
      },
    });
  typia.assert(product);

  // 4. Seller creates a SKU for the product (minItems<1> variant_attribute_value_ids)
  const dummyVariantId = typia.random<string & tags.Format<"uuid">>();
  const skuCode = RandomGenerator.alphaNumeric(10);
  const sku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode,
      body: {
        sku_code: skuCode,
        price: 5000,
        is_active: true,
        barcode: RandomGenerator.alphaNumeric(8),
        status: "in_stock",
        variant_attribute_value_ids: [dummyVariantId],
      },
    });
  typia.assert(sku);

  // 5. Register a customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://example.com/registration",
        referrer: "https://google.com/",
        ip: null,
      },
    });
  typia.assert(customer);

  // 6. Customer places an order with valid addresses
  const shipping: IShoppingOrderAddress.ICreate = {
    type: "shipping",
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    zip_code: RandomGenerator.alphaNumeric(5),
    base_address: RandomGenerator.paragraph({ sentences: 2 }),
    detail_address: null,
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.paragraph({ sentences: 1 }),
    country: "Republic of Test",
  };
  const orderBody: IShoppingOrder.ICreate = {
    total_price: 5000,
    order_lines: [
      {
        shopping_sku_id: sku.id,
        quantity: 1,
        unit_price: 5000,
      },
    ],
    shipping_addresses: [shipping],
    payment_method: "test_card",
    coupon_code: null,
  };
  const order: IShoppingOrder =
    await api.functional.shopping.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 7. As admin, retrieve order by order_code
  const adminOrder: IShoppingOrder =
    await api.functional.shopping.admin.orders.at(connection, {
      orderCode: order.order_code,
    });
  typia.assert(adminOrder);

  // 8. Validate the order is the one just created and includes full detail
  TestValidator.equals(
    "order_code matches",
    adminOrder.order_code,
    order.order_code,
  );
  TestValidator.predicate(
    "admin can view all required top-level order properties",
    typeof adminOrder.total_price === "number" &&
      adminOrder.status !== undefined &&
      Array.isArray(adminOrder.order_lines) &&
      Array.isArray(adminOrder.order_splits) &&
      Array.isArray(adminOrder.addresses) &&
      Array.isArray(adminOrder.status_history) &&
      Array.isArray(adminOrder.payment_attempts) &&
      Array.isArray(adminOrder.shipments),
  );

  TestValidator.predicate(
    "order_lines contains the SKU ordered",
    adminOrder.order_lines.some((line) => line.sku.sku_code === skuCode),
  );
}
