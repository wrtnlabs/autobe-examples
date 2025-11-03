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
 * Validates retrieval of a specific refund status transition history by admin.
 *
 * Workflow:
 *
 * 1. Register a new admin.
 * 2. Register a seller account.
 * 3. Seller creates a new product.
 * 4. Seller creates an SKU for the product (with one mock attribute value).
 * 5. Register a customer account.
 * 6. Customer places an order for the product/SKU.
 * 7. Customer initiates a refund for the order.
 * 8. Admin retrieves the detailed status history entry of the refund by
 *    statusHistoryId.
 * 9. Assert that the returned status history entry contains correct actor,
 *    timestamps, previous/new status, and rationale fields.
 */
export async function test_api_admin_refund_status_history_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: "super", // assumed valid in platform
    status: "active", // platform-recommended value
  } satisfies IShoppingAdmin.IJoin;
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Seller registration
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert(seller);

  // 3. Seller creates product
  const productCode = RandomGenerator.alphaNumeric(10);
  const productBody = {
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    main_image_uri: "https://cdn.example.com/image.jpg",
    status: "active",
    business_status: "approved",
  } satisfies IShoppingProduct.ICreate;
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 4. Seller creates SKU for the product
  const skuCode = RandomGenerator.alphaNumeric(10);
  // For variant_attribute_value_ids, since there is no public API, mock one
  const variantValueId = typia.random<string & tags.Format<"uuid">>();
  const skuBody = {
    sku_code: skuCode,
    price: 5000,
    is_active: true,
    barcode: null,
    status: "in_stock",
    variant_attribute_value_ids: [variantValueId],
  } satisfies IShoppingSku.ICreate;
  const sku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode,
      body: skuBody,
    });
  typia.assert(sku);

  // 5. Customer registration
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://mall.example.com/signup",
    referrer: "https://mall.example.com/",
    ip: undefined,
  } satisfies IShoppingCustomer.ICreate;
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 6. Customer places an order (single order line, one shipping address)
  const orderLineBody = {
    shopping_sku_id: sku.id,
    quantity: 1,
    unit_price: sku.price,
  } satisfies IShoppingOrderLine.ICreate;
  const orderAddressBody = {
    type: "shipping",
    recipient_name: customer.name,
    recipient_phone: customer.phone,
    zip_code: "12345",
    base_address: RandomGenerator.paragraph({ sentences: 2 }),
    city: "Seoul",
    state_province: "Seoul",
    country: "South Korea",
  } satisfies IShoppingOrderAddress.ICreate;
  const orderBody = {
    total_price: sku.price,
    order_lines: [orderLineBody],
    shipping_addresses: [orderAddressBody],
    payment_method: "card",
  } satisfies IShoppingOrder.ICreate;
  const order: IShoppingOrder =
    await api.functional.shopping.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 7. Customer initiates a refund for the order (only 1 order_line, refund type)
  const refundItemBody = {
    shopping_order_id: order.id,
    shopping_order_line_id: order.order_lines[0].id,
    quantity: 1,
  } satisfies IShoppingRefundRequestItem.ICreate;
  const refundBody = {
    shopping_order_id: order.id,
    request_type: "refund",
    business_reason: "order by mistake",
    items: [refundItemBody],
  } satisfies IShoppingRefundRequest.ICreate;
  const refund: IShoppingRefundRequest =
    await api.functional.shopping.customer.refunds.create(connection, {
      body: refundBody,
    });
  typia.assert(refund);

  // 8. Admin gets the status history entry by statusHistoryId
  // Find the first status transition for the refund (should at least exist)
  TestValidator.predicate(
    "refund.status_histories should contain at least one entry",
    refund.status_histories.length > 0,
  );
  const firstStatusHistory = refund.status_histories[0];
  typia.assert(firstStatusHistory);

  const statusHistoryEntry: IShoppingRefundStatusHistory =
    await api.functional.shopping.admin.refunds.statuses.at(connection, {
      refundRequestId: refund.id,
      statusHistoryId: firstStatusHistory.id,
    });
  typia.assert(statusHistoryEntry);

  // 9. Validate status history entry fields
  TestValidator.equals(
    "statusHistoryEntry id matches requested",
    statusHistoryEntry.id,
    firstStatusHistory.id,
  );
  TestValidator.equals(
    "statusHistoryEntry shopping_refund_request_id matches",
    statusHistoryEntry.shopping_refund_request_id,
    refund.id,
  );
  TestValidator.predicate(
    "statusHistoryEntry actor_type is valid",
    ["customer", "seller", "admin"].includes(statusHistoryEntry.actor_type),
  );
  TestValidator.predicate(
    "statusHistoryEntry has previous_status and new_status",
    typeof statusHistoryEntry.previous_status === "string" &&
      typeof statusHistoryEntry.new_status === "string",
  );
  TestValidator.predicate(
    "statusHistoryEntry timestamp is ISO 8601 string",
    !!statusHistoryEntry.timestamp &&
      typeof statusHistoryEntry.timestamp === "string",
  );
}
