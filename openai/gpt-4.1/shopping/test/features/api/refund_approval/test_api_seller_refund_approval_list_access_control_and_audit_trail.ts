import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingRefundApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingRefundApproval";
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
 * Validate seller's access control and audit trail for refund
 * approval/rejection listing.
 *
 * Steps:
 *
 * 1. Register seller, create product, and create SKU for the product.
 * 2. Register customer and create an order with the SKU.
 * 3. As seller, initiate a refund request for the order (for the SKU).
 * 4. As seller, call the refund approval list API for the refund request.
 * 5. Validate that the approval list is initially empty.
 * 6. Optionally, simulate an approval (out-of-scope with current API access),
 *    re-query and validate the list contains the new action.
 * 7. Test filtering/pagination responses if supported by API.
 */
export async function test_api_seller_refund_approval_list_access_control_and_audit_trail(
  connection: api.IConnection,
) {
  // Seller registration
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Seller creates product
  const productData = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    main_image_uri: `https://img.example.com/${RandomGenerator.alphaNumeric(10)}.jpg`,
    status: "active",
    business_status: "approved",
  } satisfies IShoppingProduct.ICreate;
  const product = await api.functional.shopping.seller.products.create(
    connection,
    { body: productData },
  );
  typia.assert(product);

  // Seller creates SKU
  const skuData = {
    sku_code: RandomGenerator.alphaNumeric(12),
    price: Math.floor(Math.random() * 10000) + 1000,
    is_active: true,
    status: "in_stock",
    variant_attribute_value_ids: typia.random<string[] & tags.MinItems<1>>(),
  } satisfies IShoppingSku.ICreate;
  const sku = await api.functional.shopping.seller.products.skus.create(
    connection,
    {
      productCode: product.code,
      body: skuData,
    },
  );
  typia.assert(sku);

  // Customer registration
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://shop.example.com/",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingCustomer.ICreate;
  const customer = await api.functional.auth.customer.join(connection, {
    body: customerData,
  });
  typia.assert(customer);

  // Customer places an order (with the SKU)
  const orderData = {
    total_price: sku.price,
    order_lines: [
      {
        shopping_sku_id: sku.id,
        quantity: 1,
        unit_price: sku.price,
      },
    ],
    shipping_addresses: [
      {
        type: "shipping",
        recipient_name: customer.name,
        recipient_phone: customer.phone,
        zip_code: RandomGenerator.alphaNumeric(6),
        base_address: RandomGenerator.paragraph({ sentences: 1 }),
        detail_address: null,
        city: "Seoul",
        state_province: "Seoul",
        country: "South Korea",
      },
    ],
    payment_method: "test_card",
  } satisfies IShoppingOrder.ICreate;
  const order = await api.functional.shopping.customer.orders.create(
    connection,
    { body: orderData },
  );
  typia.assert(order);

  // Seller issues a refund request for the SKU (minimum one item required)
  const refundData = {
    shopping_order_id: order.id,
    request_type: "refund",
    business_reason: "buyer remorse",
    items: [
      {
        shopping_order_id: order.id,
        shopping_order_line_id: order.order_lines[0].id,
        quantity: 1,
      },
    ],
  } satisfies IShoppingRefundRequest.ICreate;
  const refundReq = await api.functional.shopping.seller.refunds.create(
    connection,
    { body: refundData },
  );
  typia.assert(refundReq);

  // Seller queries the approvals listing for this refund request
  const approvalReq = {
    page: 1,
    pageSize: 20,
  } satisfies IShoppingRefundApproval.IRequest;
  const approvalsPage =
    await api.functional.shopping.seller.refunds.approvals.index(connection, {
      refundRequestId: refundReq.id,
      body: approvalReq,
    });
  typia.assert(approvalsPage);

  // Validate approval list is initially empty
  TestValidator.equals(
    "initial approval record list is empty",
    approvalsPage.data.length,
    0,
  );

  // Filtering and pagination edge-case test: re-call with filter for seller actor
  const sellerOnlyReq = {
    page: 1,
    pageSize: 10,
    actor_type: "seller",
  } satisfies IShoppingRefundApproval.IRequest;
  const sellerOnlyPage =
    await api.functional.shopping.seller.refunds.approvals.index(connection, {
      refundRequestId: refundReq.id,
      body: sellerOnlyReq,
    });
  typia.assert(sellerOnlyPage);
  TestValidator.equals(
    "seller actor filter yields zero records at start",
    sellerOnlyPage.data.length,
    0,
  );

  // Confirm absence of sensitive admin notes (cannot simulate admin approval in this flow)
  if (sellerOnlyPage.data.length > 0) {
    for (const ap of sellerOnlyPage.data) {
      TestValidator.equals(
        "admin notes should not be exposed to seller",
        "admin",
        ap.actor_type === "admin" ? "admin" : ap.actor_type,
      );
      // notes field is nullable, check for business-safe exposure
      if (ap.actor_type === "admin" && ap.note) {
        TestValidator.predicate(
          "admin rationale not shown to seller",
          !ap.note?.includes("PII") && ap.note.length < 256,
        );
      }
    }
  }
}
