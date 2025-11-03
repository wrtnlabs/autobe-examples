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
 * Validate customer access to their own refund/return/cancellation request
 * detail.
 *
 * 1. Register and authenticate a unique customer (Customer A).
 * 2. Seller creates a test product.
 * 3. Create a SKU for the product.
 * 4. Customer A places an order for the SKU.
 * 5. Customer A submits a refund request for that order/SKU line.
 * 6. As Customer A, fetch the refund request detail:
 *
 *    - Assert all critical fields (actor/ownership, order, items, attachments,
 *         status).
 *    - Assert itemization and audit objects are present and correct.
 *    - Check actor.ownership is consistent.
 * 7. Register and authenticate another customer (Customer B).
 * 8. As Customer B, attempt to fetch Customer A's refund request detail (must
 *    fail/error).
 */
export async function test_api_refund_request_detail_by_customer(
  connection: api.IConnection,
) {
  // --- 1. Register and authenticate a unique customer (Customer A) ---
  const customerA_email: string = typia.random<string & tags.Format<"email">>();
  const customerA_password: string = RandomGenerator.alphaNumeric(12);
  const customerA: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerA_email,
        password: customerA_password,
        name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
        href: "https://example.com/register",
        referrer: "https://google.com",
        ip: undefined,
      } satisfies IShoppingCustomer.ICreate,
    });
  typia.assert(customerA);
  TestValidator.equals(
    "customer email match",
    customerA.email,
    customerA_email,
  );

  // --- 2. Seller creates a test product ---
  // For this test, we use an already-authenticated seller account context
  // (Assume connection is seller-authenticated, or skip authentication)
  const productCode: string = RandomGenerator.alphaNumeric(12);
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 8,
        }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        main_image_uri: "https://cdn.example.com/product.jpg",
        status: "active",
        business_status: "approved",
        shipping_weight_grams: 300,
        shipping_length_cm: 20,
        shipping_width_cm: 10,
        shipping_height_cm: 5,
        shipping_options: "Standard",
      } satisfies IShoppingProduct.ICreate,
    });
  typia.assert(product);
  TestValidator.equals("created product code", product.code, productCode);

  // --- 3. Create a SKU for the product ---
  const skuCode: string = RandomGenerator.alphaNumeric(10);
  const sku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: productCode,
      body: {
        sku_code: skuCode,
        price: 9900,
        is_active: true,
        barcode: null,
        status: "in_stock",
        variant_attribute_value_ids: [], // For test simplicity, no variants
      } satisfies IShoppingSku.ICreate,
    });
  typia.assert(sku);
  TestValidator.equals("created SKU code", sku.sku_code, skuCode);

  // --- 4. Customer A places an order for the SKU ---
  // Switch connection to Customer A context (already authenticated)
  // Note: total_price must match the sum of order_lines, and addresses must be present.
  const shippingAddr: IShoppingOrderAddress.ICreate = {
    type: "shipping",
    recipient_name: RandomGenerator.name(2),
    recipient_phone: RandomGenerator.mobile(),
    zip_code: "12345",
    base_address: "123 Test St",
    detail_address: "Apt 101",
    city: "Seoul",
    state_province: "Seoul",
    country: "South Korea",
  };
  const orderLine: IShoppingOrderLine.ICreate = {
    shopping_sku_id: sku.id,
    quantity: 1,
    unit_price: sku.price,
  };
  const order: IShoppingOrder =
    await api.functional.shopping.customer.orders.create(connection, {
      body: {
        total_price: sku.price, // 1 x unit_price
        order_lines: [orderLine],
        shipping_addresses: [shippingAddr],
        payment_method: "card",
        coupon_code: null,
      } satisfies IShoppingOrder.ICreate,
    });
  typia.assert(order);
  TestValidator.equals(
    "order includes correct SKU line",
    order.order_lines[0].sku.id,
    sku.id,
  );
  TestValidator.equals(
    "order customer matches A",
    order.customer.id,
    customerA.id,
  );

  // --- 5. Customer A submits a refund request for the order/SKU line ---
  const businessReason = "item defective";
  const refundReqData: IShoppingRefundRequest.ICreate = {
    shopping_order_id: order.id,
    request_type: "refund",
    business_reason: businessReason,
    request_context: "Product arrived damaged",
    items: [
      {
        shopping_order_id: order.id,
        shopping_order_line_id: order.order_lines[0].id,
        quantity: 1,
        item_business_reason: "Box was crushed",
        attachments: [], // Attachments can be left empty for the test
      },
    ],
    attachments: [],
  };
  const refund: IShoppingRefundRequest =
    await api.functional.shopping.admin.refunds.create(connection, {
      body: refundReqData,
    });
  typia.assert(refund);
  // Assert refund order match & itemization
  TestValidator.equals("refund order id matches", refund.order.id, order.id);
  TestValidator.equals(
    "refund actor is customer",
    refund.actor.actor_type,
    "customer",
  );
  TestValidator.equals(
    "refund actor id matches A",
    refund.actor.id,
    customerA.id,
  );
  TestValidator.equals(
    "refund request type matches",
    refund.request_type,
    "refund",
  );
  TestValidator.equals(
    "refund reason matches",
    refund.business_reason,
    businessReason,
  );
  TestValidator.equals(
    "refund items order line id",
    refund.items[0].shopping_order_line_id,
    order.order_lines[0].id,
  );
  TestValidator.equals(
    "refund items order id",
    refund.items[0].shopping_order_id,
    order.id,
  );

  // --- 6. As Customer A, fetch refund request detail and verify access ---
  const detail: IShoppingRefundRequest =
    await api.functional.shopping.customer.refunds.at(connection, {
      refundRequestId: refund.id,
    });
  typia.assert(detail);
  TestValidator.equals(
    "detail actor is customer",
    detail.actor.actor_type,
    "customer",
  );
  TestValidator.equals(
    "detail actor id is customerA",
    detail.actor.id,
    customerA.id,
  );
  TestValidator.equals("detail order id matches", detail.order.id, order.id);
  TestValidator.equals(
    "detail items count matches refund request",
    detail.items.length,
    refundReqData.items.length,
  );
  // Audit and status history checks
  TestValidator.predicate(
    "status_histories present and array",
    Array.isArray(detail.status_histories) &&
      detail.status_histories.length > 0,
  );

  // --- 7. Register and authenticate another customer (Customer B) ---
  const customerB_email: string = typia.random<string & tags.Format<"email">>();
  const customerB_password: string = RandomGenerator.alphaNumeric(12);
  const customerB: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerB_email,
        password: customerB_password,
        name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
        href: "https://example.com/register",
        referrer: "https://google.com",
        ip: undefined,
      } satisfies IShoppingCustomer.ICreate,
    });
  typia.assert(customerB);

  // Because the connection context will still be customerA, switch to B's connection
  // Simulate switching by updating auth for customerB
  const customerBConn: api.IConnection = { ...connection };
  // After registration, connection.headers are automatically updated to B's token

  // --- 8. As Customer B, attempt to access Customer A's refund request detail (should error) ---
  await TestValidator.error(
    "Customer B denied access to A's refund detail",
    async () => {
      // Update connection to B's token (should already be done by join)
      await api.functional.shopping.customer.refunds.at(customerBConn, {
        refundRequestId: refund.id,
      });
    },
  );
}
