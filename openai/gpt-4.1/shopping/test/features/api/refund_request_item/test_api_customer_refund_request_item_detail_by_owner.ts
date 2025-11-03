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

export async function test_api_customer_refund_request_item_detail_by_owner(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword as string &
          tags.MinLength<8> &
          tags.MaxLength<128>,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://test.example.com/welcome",
        referrer: "https://test.example.com/landing",
        ip: undefined,
      },
    });
  typia.assert(customer);

  // 2. Seller creates product
  const productCode = `AUTOBE-PROD-${RandomGenerator.alphaNumeric(8)}`;
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        main_image_uri: "https://cdn.example.com/image.jpg",
        status: "active",
        business_status: "in_review",
      },
    });
  typia.assert(product);

  // 3. Seller creates SKU for product
  const attrValueIds =
    product.attributes?.map((attr) => attr.attribute_value.id) ?? [];
  const skuCode = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const sku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode,
      body: {
        sku_code: skuCode,
        price: 8999,
        is_active: true,
        barcode: null,
        status: "in_stock",
        variant_attribute_value_ids: attrValueIds.length
          ? attrValueIds
          : [typia.random<string & tags.Format<"uuid">>()],
      },
    });
  typia.assert(sku);

  // 4. Customer places order
  const address = {
    type: "shipping",
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    zip_code: "12345",
    base_address: RandomGenerator.paragraph({ sentences: 3 }),
    detail_address: null,
    city: "Metropolis",
    state_province: "Seoul",
    country: "South Korea",
  } satisfies IShoppingOrderAddress.ICreate;
  const line = {
    shopping_sku_id: sku.id,
    quantity: 1,
    unit_price: sku.price,
  } satisfies IShoppingOrderLine.ICreate;

  const order: IShoppingOrder =
    await api.functional.shopping.customer.orders.create(connection, {
      body: {
        total_price: line.quantity * sku.price,
        order_lines: [line],
        shipping_addresses: [address],
        payment_method: "card",
      },
    });
  typia.assert(order);
  TestValidator.equals(
    "order contains submitted SKU",
    order.order_lines[0].sku.id,
    sku.id,
  );

  // 5. Customer submits refund request
  const refundReq: IShoppingRefundRequest =
    await api.functional.shopping.customer.refunds.create(connection, {
      body: {
        shopping_order_id: order.id,
        request_type: "refund",
        business_reason: "Damaged on arrival",
        items: [
          {
            shopping_order_id: order.id,
            shopping_order_line_id: order.order_lines[0].id,
            quantity: 1,
            item_business_reason: "Box was crushed and product broken",
            attachments: undefined,
          },
        ],
      },
    });
  typia.assert(refundReq);
  TestValidator.equals(
    "refund linked to correct order",
    refundReq.order.id,
    order.id,
  );
  const refundItem = refundReq.items[0];
  TestValidator.equals(
    "refund item order line correct",
    refundItem.shopping_order_line_id,
    order.order_lines[0].id,
  );

  // 6. Add additional refund request item (optional, skipped if not needed)
  // 7. Retrieve refund request item detail as owner
  const detail: IShoppingRefundRequestItem =
    await api.functional.shopping.customer.refunds.items.at(connection, {
      refundRequestId: refundReq.id,
      itemId: refundItem.id,
    });
  typia.assert(detail);
  TestValidator.equals(
    "refund item detail id matches",
    detail.id,
    refundItem.id,
  );
  TestValidator.equals(
    "refund item order id",
    detail.shopping_order_id,
    order.id,
  );
  TestValidator.equals(
    "refund item order line id",
    detail.shopping_order_line_id,
    order.order_lines[0].id,
  );
  TestValidator.equals(
    "refund item SKU matches",
    detail.shopping_order_line_id,
    order.order_lines[0].id,
  );
  TestValidator.equals("refund item quantity", detail.quantity, 1);
  TestValidator.equals(
    "item business reason matches",
    detail.item_business_reason,
    "Box was crushed and product broken",
  );
}
