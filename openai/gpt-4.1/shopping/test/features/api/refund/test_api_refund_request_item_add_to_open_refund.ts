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
 * Tests the appending of refund request items to an open refund by a registered
 * customer, verifying business workflow for eligible SKU/order line additions,
 * duplicate prevention, and quantity constraints. Covers: account creation for
 * customer/seller, product/SKU setup, order/checkout, opening a refund, adding
 * new eligible item, attempting duplicate/over-quantity, and confirming proper
 * business error handling.
 */
export async function test_api_refund_request_item_add_to_open_refund(
  connection: api.IConnection,
) {
  // 1. Register a seller and authenticate
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "testpassword1",
        display_name: RandomGenerator.name(),
        contact_phone: RandomGenerator.mobile(),
        status: "pending",
      } satisfies IShoppingSeller.IJoin,
    });
  typia.assert(seller);

  // 2. Create a product as the seller
  const productBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    main_image_uri: "https://cdn.example.com/product.jpg",
    status: "active",
    business_status: "approved",
  } satisfies IShoppingProduct.ICreate;
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 3. Create two SKUs (simulate size/color by attribute ids) for the product
  const attrId1 = typia.random<string & tags.Format<"uuid">>();
  const attrId2 = typia.random<string & tags.Format<"uuid">>();
  const skuCode1 = RandomGenerator.alphaNumeric(8);
  const skuCode2 = RandomGenerator.alphaNumeric(8);
  const skuBody1 = {
    sku_code: skuCode1,
    price: 1000,
    is_active: true,
    status: "in_stock",
    variant_attribute_value_ids: [attrId1],
  } satisfies IShoppingSku.ICreate;
  const skuBody2 = {
    sku_code: skuCode2,
    price: 1500,
    is_active: true,
    status: "in_stock",
    variant_attribute_value_ids: [attrId2],
  } satisfies IShoppingSku.ICreate;
  const sku1: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuBody1,
    });
  typia.assert(sku1);
  const sku2: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuBody2,
    });
  typia.assert(sku2);

  // 4. Register a customer and authenticate
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "testcustomer1",
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://shopper.example.com/account/register",
        referrer: "https://shopper.example.com/",
        ip: undefined,
      } satisfies IShoppingCustomer.ICreate,
    });
  typia.assert(customer);

  // 5. Customer places an order with two SKUs (quantity 2 each)
  const shippingAddress: IShoppingOrderAddress.ICreate = {
    type: "shipping",
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    zip_code: RandomGenerator.alphaNumeric(5),
    base_address: RandomGenerator.paragraph({ sentences: 2 }),
    detail_address: null,
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    country: "Testland",
  };
  const orderLines: IShoppingOrderLine.ICreate[] = [
    {
      shopping_sku_id: sku1.id,
      quantity: 2,
      unit_price: sku1.price satisfies number as number,
    },
    {
      shopping_sku_id: sku2.id,
      quantity: 2,
      unit_price: sku2.price satisfies number as number,
    },
  ];
  const orderBody = {
    total_price: sku1.price * 2 + sku2.price * 2,
    order_lines: orderLines,
    shipping_addresses: [shippingAddress],
    payment_method: "card",
    coupon_code: null,
  } satisfies IShoppingOrder.ICreate;
  const order: IShoppingOrder =
    await api.functional.shopping.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);
  TestValidator.equals("order has 2 order_lines", order.order_lines.length, 2);

  // 6. Customer creates an initial refund request for only the first order line (1 item)
  const refundRequestBody = {
    shopping_order_id: order.id,
    request_type: "refund",
    business_reason: "item defective",
    request_context: "Initial refund request for SKU1",
    items: [
      {
        shopping_order_id: order.id,
        shopping_order_line_id: order.order_lines[0].id,
        quantity: 1,
        item_business_reason: "defective item",
        attachments: [],
      },
    ] satisfies IShoppingRefundRequestItem.ICreate[],
  } satisfies IShoppingRefundRequest.ICreate;
  const refund: IShoppingRefundRequest =
    await api.functional.shopping.customer.refunds.create(connection, {
      body: refundRequestBody,
    });
  typia.assert(refund);
  TestValidator.equals("refund has 1 item", refund.items.length, 1);

  // 7. Customer appends additional eligible order line (SKU2) to the refund (should succeed)
  const secondRefundItemBody = {
    shopping_order_id: order.id,
    shopping_order_line_id: order.order_lines[1].id,
    quantity: 2, // all units for this SKU
    item_business_reason: "wrong item shipped",
    attachments: [],
  } satisfies IShoppingRefundRequestItem.ICreate;
  const addedItem: IShoppingRefundRequestItem =
    await api.functional.shopping.customer.refunds.items.create(connection, {
      refundRequestId: refund.id,
      body: secondRefundItemBody,
    });
  typia.assert(addedItem);
  TestValidator.equals(
    "Refund item shopping_order_line_id matches",
    addedItem.shopping_order_line_id,
    order.order_lines[1].id,
  );
  TestValidator.equals(
    "Refund item quantity as requested",
    addedItem.quantity,
    2,
  );

  // 8. Try to add duplicate order line (SKU2) to refund (should fail)
  await TestValidator.error(
    "reject duplicate refund item for same order line",
    async () => {
      await api.functional.shopping.customer.refunds.items.create(connection, {
        refundRequestId: refund.id,
        body: secondRefundItemBody,
      });
    },
  );

  // 9. Try to add an item with over-quantity for initial order line (SKU1; ask to refund 3 when only 2 ordered and 1 already in refund)
  const overQuantityRefundItemBody = {
    shopping_order_id: order.id,
    shopping_order_line_id: order.order_lines[0].id,
    quantity: 2,
    item_business_reason: "want refund for more than allowed",
    attachments: [],
  } satisfies IShoppingRefundRequestItem.ICreate;
  await TestValidator.error(
    "reject over-quantity addition to refund for order line",
    async () => {
      await api.functional.shopping.customer.refunds.items.create(connection, {
        refundRequestId: refund.id,
        body: overQuantityRefundItemBody,
      });
    },
  );
}
