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
import type { IShoppingRefundActor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundActor";
import type { IShoppingRefundAdminOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundAdminOverride";
import type { IShoppingRefundApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundApproval";
import type { IShoppingRefundAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundAttachment";
import type { IShoppingRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundRequest";
import type { IShoppingRefundRequestItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundRequestItem";
import type { IShoppingRefundStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundStatusHistory";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingSkuImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuImage";
import type { IShoppingSkuVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuVariant";
import type { IShoppingTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingTag";

/**
 * Test: Admin access to refund request item details for audit/compliance.
 *
 * This test validates the complete refund workflow for an order by spanning
 * seller, customer, and admin actors. It ensures the admin API can retrieve any
 * refund request item detail for compliance review, regardless of originator.
 * The process:
 *
 * 1. Admin registers and authenticates
 * 2. Seller registers and creates a product
 * 3. Seller adds SKU to product
 * 4. Customer registers
 * 5. Customer creates an order for the SKU
 * 6. Customer requests a refund
 * 7. Customer adds a refund request item for an order line
 * 8. Admin fetches refund item detail using privileged endpoint
 * 9. Assert all fields and structure are as expected
 */
export async function test_api_refund_item_detail_access_by_admin(
  connection: api.IConnection,
) {
  // 1. Register/admin
  const adminEmail =
    RandomGenerator.name(1).replace(/\s/g, "") +
    RandomGenerator.alphaNumeric(6) +
    "@admin.com";
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail satisfies string as string,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(1),
      role: "super",
      status: "active",
    },
  });
  typia.assert(admin);

  // 2. Register seller
  const sellerEmail =
    RandomGenerator.name(1).replace(/\s/g, "") +
    RandomGenerator.alphaNumeric(6) +
    "@shop.com";
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail satisfies string as string,
      password: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(1),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    },
  });
  typia.assert(seller);

  // 3. Seller creates product
  const productCode = RandomGenerator.alphaNumeric(12).toUpperCase();
  const product = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 8,
        }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 8,
          wordMin: 3,
          wordMax: 8,
        }),
        main_image_uri: `https://cdn.example.com/images/${RandomGenerator.alphaNumeric(24)}.png`,
        status: "draft",
        business_status: "in_review",
      },
    },
  );
  typia.assert(product);

  // 4. Seller creates SKU for product
  const skuCode = RandomGenerator.alphaNumeric(14).toUpperCase();
  const sku = await api.functional.shopping.seller.products.skus.create(
    connection,
    {
      productCode: productCode,
      body: {
        sku_code: skuCode,
        price: Math.floor(Math.random() * 400 + 10000),
        is_active: true,
        status: "in_stock",
        variant_attribute_value_ids: [RandomGenerator.alphaNumeric(10)],
      },
    },
  );
  typia.assert(sku);

  // 5. Register customer
  const customerEmail =
    RandomGenerator.name(1).replace(/\s/g, "") +
    RandomGenerator.alphaNumeric(7) +
    "@mail.com";
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail satisfies string as string,
      password: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
      href: `https://shop.example.com/register/${RandomGenerator.alphaNumeric(14)}`,
      referrer: `https://shop.example.com/landing/${RandomGenerator.alphaNumeric(8)}`,
    },
  });
  typia.assert(customer);

  // 6. Customer creates order for SKU
  const order = await api.functional.shopping.customer.orders.create(
    connection,
    {
      body: {
        total_price: sku.price,
        order_lines: [
          {
            shopping_sku_id: sku.id,
            quantity: 1,
            unit_price: sku.price satisfies number as number,
          },
        ],
        shipping_addresses: [
          {
            type: "shipping",
            recipient_name: customer.name,
            recipient_phone: customer.phone,
            zip_code: "12345",
            base_address: "101 Test Avenue",
            detail_address: null,
            city: "Test City",
            state_province: "Test State",
            country: "Wonderland",
          },
        ],
        payment_method: "default",
      },
    },
  );
  typia.assert(order);

  // 7. Customer requests refund for order
  const refundRequest = await api.functional.shopping.customer.refunds.create(
    connection,
    {
      body: {
        shopping_order_id: order.id,
        request_type: "refund",
        business_reason: "defective_item",
        items: [],
      },
    },
  );
  typia.assert(refundRequest);

  // 8. Customer adds refund request item
  const orderLineId = order.order_lines[0].id;
  const refundItem =
    await api.functional.shopping.customer.refunds.items.create(connection, {
      refundRequestId: refundRequest.id,
      body: {
        shopping_order_id: order.id,
        shopping_order_line_id: orderLineId,
        quantity: 1,
      },
    });
  typia.assert(refundItem);

  // 9. Switch to admin session (already authenticated at top)
  // 10. Admin retrieves refund item detail
  const got = await api.functional.shopping.admin.refunds.items.at(connection, {
    refundRequestId: refundRequest.id,
    itemId: refundItem.id,
  });
  typia.assert(got);
  // 11. Validate retrieved refund item matches inserted one
  TestValidator.equals(
    "refundRequestId should match",
    got.shopping_refund_request_id,
    refundRequest.id,
  );
  TestValidator.equals(
    "order id should match",
    got.shopping_order_id,
    order.id,
  );
  TestValidator.equals(
    "order line id should match",
    got.shopping_order_line_id,
    orderLineId,
  );
  TestValidator.equals("item id should match", got.id, refundItem.id);
  TestValidator.equals("quantity", got.quantity, 1);
  TestValidator.equals("all fields are accessible", got, { ...got });
}
