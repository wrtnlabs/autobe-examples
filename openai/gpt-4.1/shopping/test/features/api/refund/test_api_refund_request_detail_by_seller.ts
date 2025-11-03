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

export async function test_api_refund_request_detail_by_seller(
  connection: api.IConnection,
) {
  // 1. Register and authenticate first seller
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const seller1Auth = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller1Email,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    },
  });
  typia.assert(seller1Auth);
  TestValidator.equals("seller1 email", seller1Auth.email, seller1Email);

  // 2. Create product under seller1
  const productCode = RandomGenerator.alphaNumeric(10);
  const product = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
        }),
        main_image_uri:
          "https://cdn.example.com/" + RandomGenerator.alphaNumeric(20),
        status: "draft",
        business_status: "in_review",
      },
    },
  );
  typia.assert(product);
  TestValidator.equals("product seller_id", product.seller.id, seller1Auth.id);
  TestValidator.equals("product code", product.code, productCode);

  // 3. Create SKU for this product
  // Pick an attribute value id (simulate)
  // We'll just randomly create an array of one random uuid for variant_attribute_value_ids
  const skuCode = RandomGenerator.alphaNumeric(8);
  const randomAttrValueId = typia.random<string & tags.Format<"uuid">>();
  const sku = await api.functional.shopping.seller.products.skus.create(
    connection,
    {
      productCode,
      body: {
        sku_code: skuCode,
        price: 78900,
        is_active: true,
        status: "in_stock",
        variant_attribute_value_ids: [randomAttrValueId],
      },
    },
  );
  typia.assert(sku);
  TestValidator.equals("SKU product code", sku.product.code, productCode);
  TestValidator.equals("SKU sku_code", sku.sku_code, skuCode);

  // 4. Switch identity: Simulate customer by using new unauthenticated connection (no authentication required for this endpoint)
  const orderAddress = {
    type: "shipping",
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    zip_code: RandomGenerator.alphaNumeric(5),
    base_address: RandomGenerator.paragraph({ sentences: 2 }),
    detail_address: null,
    city: RandomGenerator.paragraph({ sentences: 1, wordMin: 3 }),
    state_province: "Seoul",
    country: "South Korea",
  } satisfies IShoppingOrderAddress.ICreate;
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
        shipping_addresses: [orderAddress],
        payment_method: "credit_card",
      },
    },
  );
  typia.assert(order);
  TestValidator.predicate(
    "order lines must exist",
    order.order_lines.length > 0,
  );
  const orderLine = order.order_lines[0];
  TestValidator.equals("orderLine.sku.id == sku.id", orderLine.sku.id, sku.id);

  // 5. Seller creates a refund request for the received order line
  // Already authenticated as seller1 (token still set)
  const refundReq = await api.functional.shopping.seller.refunds.create(
    connection,
    {
      body: {
        shopping_order_id: order.id,
        request_type: "refund",
        business_reason: "customer_change_mind",
        request_context: "Refund scenario setup",
        items: [
          {
            shopping_order_id: order.id,
            shopping_order_line_id: orderLine.id,
            quantity: 1,
            item_business_reason: "test item refund",
          },
        ],
        attachments: [
          {
            attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
            attachment_type: "evidence",
            file_uri:
              "https://cdn.example.com/" + RandomGenerator.alphaNumeric(24),
            file_type: "image/png",
            file_size: 1200000,
            description: "photo evidence",
          },
        ],
      },
    },
  );
  typia.assert(refundReq);
  TestValidator.equals("refund request type", refundReq.request_type, "refund");
  TestValidator.equals("refund request order.id", refundReq.order.id, order.id);
  TestValidator.equals(
    "refund has item",
    refundReq.items[0].shopping_order_line_id,
    orderLine.id,
  );
  TestValidator.equals(
    "refund has attachment",
    refundReq.attachments.length,
    1,
  );
  TestValidator.equals(
    "refund actor is seller",
    refundReq.actor.actor_type,
    "seller",
  );
  TestValidator.equals("refund actor id", refundReq.actor.id, seller1Auth.id);

  const refundRequestId = refundReq.id;

  // 6. Seller retrieves their refund request detail & verifies business info
  const refundDetail = await api.functional.shopping.seller.refunds.at(
    connection,
    {
      refundRequestId,
    },
  );
  typia.assert(refundDetail);
  // Validate basic structure
  TestValidator.equals("refund id", refundDetail.id, refundReq.id);
  TestValidator.equals(
    "seller can see all items",
    refundDetail.items.length,
    1,
  );
  TestValidator.equals(
    "seller can see attachments",
    refundDetail.attachments.length,
    refundReq.attachments.length,
  );
  TestValidator.equals("refund status", refundDetail.status, refundReq.status);
  TestValidator.equals(
    "refund business reason",
    refundDetail.business_reason,
    refundReq.business_reason,
  );
  // Spot check histories, approvals, admin overrides arrays (may be empty at this step, but at least exist)
  TestValidator.predicate(
    "histories exist as array",
    Array.isArray(refundDetail.status_histories),
  );
  TestValidator.predicate(
    "approvals exist as array",
    Array.isArray(refundDetail.approvals),
  );
  TestValidator.predicate(
    "admin overrides exist as array",
    Array.isArray(refundDetail.admin_overrides),
  );

  // 7. Register a second seller and confirm they CANNOT access seller1's refund request
  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller2Auth = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller2Email,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    },
  });
  typia.assert(seller2Auth);
  await TestValidator.error(
    "unrelated seller cannot access another's refund request",
    async () => {
      await api.functional.shopping.seller.refunds.at(connection, {
        refundRequestId,
      });
    },
  );
}
