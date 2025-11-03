import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingRefundStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingRefundStatusHistory";
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

export async function test_api_customer_refund_status_history_ordering_and_metadata(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://e2e-test.local/registration",
      referrer: "https://e2e-test.local/landing",
    },
  });
  typia.assert(customer);
  // Save customer id for actor matching later
  const customerId = customer.id;

  // 2. Seller creates product
  const product = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        main_image_uri:
          "https://e2e-test.local/images/" +
          RandomGenerator.alphaNumeric(8) +
          ".jpg",
        status: "active",
        business_status: "approved",
        shipping_weight_grams: 500,
        shipping_length_cm: 10,
        shipping_width_cm: 10,
        shipping_height_cm: 10,
        shipping_options: "standard",
      },
    },
  );
  typia.assert(product);

  // 3. Seller creates a SKU for the product
  const sku = await api.functional.shopping.seller.products.skus.create(
    connection,
    {
      productCode: product.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(10),
        price: 9900,
        is_active: true,
        barcode: RandomGenerator.alphaNumeric(15),
        status: "in_stock",
        variant_attribute_value_ids: [
          product.attributes.length > 0
            ? product.attributes[0].attribute_value.id
            : typia.random<string & tags.Format<"uuid">>(),
        ],
      },
    },
  );
  typia.assert(sku);

  // 4. Customer creates an order for the SKU
  const shippingAddress = {
    type: "shipping",
    recipient_name: customer.name,
    recipient_phone: customer.phone,
    zip_code: "12345",
    base_address: "123 Test St",
    detail_address: "Suite 100",
    city: "Seoul",
    state_province: "Seoul",
    country: "Korea",
  } as const satisfies IShoppingOrderAddress.ICreate;

  const order = await api.functional.shopping.customer.orders.create(
    connection,
    {
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
        payment_method: "testcard",
      },
    },
  );
  typia.assert(order);
  const orderLineId = order.order_lines[0]?.id;

  // 5. Customer creates a refund request for the order
  const refund = await api.functional.shopping.customer.refunds.create(
    connection,
    {
      body: {
        shopping_order_id: order.id,
        request_type: "refund",
        business_reason: "item defective",
        items: [
          {
            shopping_order_id: order.id,
            shopping_order_line_id: orderLineId,
            quantity: 1,
          },
        ],
      },
    },
  );
  typia.assert(refund);

  // 6. Retrieve the refund status history using the refundRequestId
  const pageHistory =
    await api.functional.shopping.customer.refunds.statuses.index(connection, {
      refundRequestId: refund.id,
      body: {
        page: 1,
        limit: 10,
        sort: "asc",
      },
    });
  typia.assert(pageHistory);

  // Must contain at least 3 business-relevant states
  TestValidator.predicate(
    "refund status histories should have at least 3 transitions",
    pageHistory.data.length >= 3,
  );
  // 7. Validate chronological order and presence of required fields
  let prevTimestamp: string | undefined;
  for (let i = 0; i < pageHistory.data.length; ++i) {
    const entry = pageHistory.data[i];
    typia.assert<IShoppingRefundStatusHistory>(entry);
    TestValidator.predicate(
      `refund status history #${i + 1}: actor_type is valid`,
      ["customer", "seller", "admin"].includes(entry.actor_type),
    );
    TestValidator.predicate(
      `refund status history #${i + 1}: shopping_actor_id is present`,
      typeof entry.shopping_actor_id === "string" &&
        entry.shopping_actor_id.length > 0,
    );
    TestValidator.predicate(
      `refund status history #${i + 1}: previous_status is present`,
      typeof entry.previous_status === "string" &&
        entry.previous_status.length > 0,
    );
    TestValidator.predicate(
      `refund status history #${i + 1}: new_status is present`,
      typeof entry.new_status === "string" && entry.new_status.length > 0,
    );
    TestValidator.predicate(
      `refund status history #${i + 1}: timestamp is present`,
      typeof entry.timestamp === "string" && entry.timestamp.length > 0,
    );
    if (i > 0) {
      TestValidator.predicate(
        `refund status history #${i + 1} occurs after previous`,
        prevTimestamp !== undefined && entry.timestamp >= prevTimestamp,
      );
    }
    prevTimestamp = entry.timestamp;
    // If context/comment is expected, check it is present/non-empty where applicable
    if (entry.new_status === "declined" || entry.new_status === "approved") {
      TestValidator.predicate(
        `refund status history #${i + 1}: change_context should not be empty for final outcome`,
        typeof entry.change_context === "string" &&
          entry.change_context.length > 0,
      );
    }
    // If initial transition, actor should be customer and IDs must match
    if (i === 0) {
      TestValidator.equals(
        "initial refund actor_type is customer",
        entry.actor_type,
        "customer",
      );
      TestValidator.equals(
        "initial refund actor id matches customer id",
        entry.shopping_actor_id,
        customerId,
      );
    }
  }
}
