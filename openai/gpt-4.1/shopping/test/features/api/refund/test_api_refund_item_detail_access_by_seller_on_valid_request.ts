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
 * Validate that an authenticated seller can fetch detailed information for a
 * refund request item when they are associated with the order being refunded.
 *
 * This test case verifies that a seller, after creating a product and an SKU,
 * can access a refund item related to an order placed by a customer and a
 * subsequent refund request. It walks through registration, product setup,
 * order, refund request, and item creation, then performs the GET on
 * seller/refunds/{refundRequestId}/items/{itemId}. The test then asserts all
 * fields are present in the response and match what was established
 * previously.
 *
 * 1. Register a seller and obtain authentication
 * 2. Seller creates a product and a SKU
 * 3. Register a customer and obtain authentication
 * 4. Customer creates an order for the SKU
 * 5. Customer creates a refund request for that order
 * 6. Customer adds a refund request item for the specific order line
 * 7. Seller fetches the refund request item detail and verifies response structure
 *    and content
 */
export async function test_api_refund_item_detail_access_by_seller_on_valid_request(
  connection: api.IConnection,
) {
  // 1. Register a seller and obtain authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        display_name: RandomGenerator.name(2),
        contact_phone: RandomGenerator.mobile(),
        status: "pending",
      } satisfies IShoppingSeller.IJoin,
    });
  typia.assert(seller);

  // 2. Seller creates a product
  const productCode = RandomGenerator.alphaNumeric(10);
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 10 }),
        main_image_uri: "https://example.com/image.jpg",
        status: "active",
        business_status: "in_review",
        shipping_weight_grams: 1000,
        shipping_length_cm: 10,
        shipping_width_cm: 10,
        shipping_height_cm: 10,
        shipping_options: "Courier",
      } satisfies IShoppingProduct.ICreate,
    });
  typia.assert(product);

  // 3. Seller creates a SKU
  const skuCode = RandomGenerator.alphaNumeric(12);
  const sku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: product.code,
      body: {
        sku_code: skuCode,
        price: 29900,
        is_active: true,
        status: "in_stock",
        variant_attribute_value_ids: [], // No attributes for simplicity
      } satisfies IShoppingSku.ICreate,
    });
  typia.assert(sku);

  // 4. Register a customer and obtain authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(10);
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword satisfies string &
          tags.MinLength<8> &
          tags.MaxLength<128> as string,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://customer.test/ref",
        referrer: "https://customer.test/prev",
        ip: undefined,
      } satisfies IShoppingCustomer.ICreate,
    });
  typia.assert(customer);

  // 5. Customer creates an order for the SKU
  const orderCreateInput = {
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
        recipient_name: RandomGenerator.name(),
        recipient_phone: RandomGenerator.mobile(),
        zip_code: "12345",
        base_address: "123 Test St",
        detail_address: "Apt 101",
        city: "Testville",
        state_province: "Test State",
        country: "TestCountry",
      } satisfies IShoppingOrderAddress.ICreate,
    ],
    payment_method: "credit_card",
    coupon_code: null,
  } satisfies IShoppingOrder.ICreate;
  const order: IShoppingOrder =
    await api.functional.shopping.customer.orders.create(connection, {
      body: orderCreateInput,
    });
  typia.assert(order);

  // 6. Customer creates a refund request for that order
  const refundReq: IShoppingRefundRequest =
    await api.functional.shopping.customer.refunds.create(connection, {
      body: {
        shopping_order_id: order.id,
        request_type: "refund",
        business_reason: "damaged item",
        request_context: "Automated test refund context",
        items: [
          {
            shopping_order_id: order.id,
            shopping_order_line_id: order.order_lines[0].id,
            quantity: 1,
          } satisfies IShoppingRefundRequestItem.ICreate,
        ],
        attachments: [],
      } satisfies IShoppingRefundRequest.ICreate,
    });
  typia.assert(refundReq);

  // 7. (Optional: Add a separate refund item via dedicated API for the test)
  // Adding another refund request item for demonstration
  const refundItem: IShoppingRefundRequestItem =
    await api.functional.shopping.customer.refunds.items.create(connection, {
      refundRequestId: refundReq.id,
      body: {
        shopping_order_id: order.id,
        shopping_order_line_id: order.order_lines[0].id,
        quantity: 1,
      } satisfies IShoppingRefundRequestItem.ICreate,
    });
  typia.assert(refundItem);

  // 8. Seller fetches the refund request item detail and verifies response
  const sellerRefundItem: IShoppingRefundRequestItem =
    await api.functional.shopping.seller.refunds.items.at(connection, {
      refundRequestId: refundReq.id,
      itemId: refundItem.id,
    });
  typia.assert(sellerRefundItem);

  // 9. Assert fields match what was created
  TestValidator.equals(
    "refund item ID matches",
    sellerRefundItem.id,
    refundItem.id,
  );
  TestValidator.equals(
    "refund request association",
    sellerRefundItem.shopping_refund_request_id,
    refundReq.id,
  );
  TestValidator.equals(
    "refund item order ID",
    sellerRefundItem.shopping_order_id,
    order.id,
  );
  TestValidator.equals(
    "refund item order line ID",
    sellerRefundItem.shopping_order_line_id,
    order.order_lines[0].id,
  );
  TestValidator.equals("refund quantity", sellerRefundItem.quantity, 1);
  TestValidator.equals(
    "created_at should be ISO string",
    typeof sellerRefundItem.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at should be ISO string",
    typeof sellerRefundItem.updated_at,
    "string",
  );
  TestValidator.equals(
    "attachments is empty array or undefined",
    Array.isArray(sellerRefundItem.attachments) ||
      sellerRefundItem.attachments === undefined,
    true,
  );
}
