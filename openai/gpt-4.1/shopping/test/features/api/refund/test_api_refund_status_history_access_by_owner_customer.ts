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
 * Validate that a customer/refund-requester can retrieve a specific refund
 * status history entry for their own refund request.
 *
 * Steps:
 *
 * 1. Register a new customer and seller account.
 * 2. Seller creates a product with at least one SKU.
 * 3. Customer places an order for the product/SKU.
 * 4. Customer requests a refund for the order.
 * 5. Retrieve the refund request's status_histories to get a valid
 *    statusHistoryId.
 * 6. As the owner customer, fetch
 *    /shopping/customer/refunds/{refundRequestId}/statuses/{statusHistoryId}
 *    and check full field access (actor, timestamp, from_status, new_status,
 *    context).
 * 7. Negative: Try getting a non-existent statusHistoryId and expect error.
 */
export async function test_api_refund_status_history_access_by_owner_customer(
  connection: api.IConnection,
) {
  // 1. Seller: registration
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(15),
    display_name: RandomGenerator.name(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert(seller);

  // 2. Seller: create product
  const productBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    main_image_uri: "https://test.com/p.jpg",
    status: "active",
    business_status: "in_review",
  } satisfies IShoppingProduct.ICreate;
  const product = await api.functional.shopping.seller.products.create(
    connection,
    { body: productBody },
  );
  typia.assert(product);

  // 3. Seller: create SKU for product
  const skuBody = {
    sku_code: RandomGenerator.alphaNumeric(12),
    price: 11100,
    is_active: true,
    status: "in_stock",
    variant_attribute_value_ids: [] as string[], // No attributes
  } satisfies IShoppingSku.ICreate;
  const sku = await api.functional.shopping.seller.products.skus.create(
    connection,
    { productCode: product.code, body: skuBody },
  );
  typia.assert(sku);

  // 4. Customer: registration
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(13),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://referrer.com/register",
    referrer: "https://referrer.com/source",
    ip: undefined,
  } satisfies IShoppingCustomer.ICreate;
  const customer = await api.functional.auth.customer.join(connection, {
    body: customerJoinBody,
  });
  typia.assert(customer);

  // 5. Customer: place order
  const orderBody = {
    total_price: sku.price,
    order_lines: [
      {
        shopping_sku_id: sku.id,
        quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        unit_price: sku.price,
      },
    ],
    shipping_addresses: [
      {
        type: "shipping",
        recipient_name: customer.name,
        recipient_phone: customer.phone,
        zip_code: "12345",
        base_address: "100 Main Street",
        city: "Seoul",
        state_province: "Seoul",
        country: "KOR",
      } satisfies IShoppingOrderAddress.ICreate,
    ],
    payment_method: "test-method",
  } satisfies IShoppingOrder.ICreate;
  const order = await api.functional.shopping.customer.orders.create(
    connection,
    { body: orderBody },
  );
  typia.assert(order);

  // 6. Customer: submit refund request for order
  const requestItem: IShoppingRefundRequestItem.ICreate = {
    shopping_order_id: order.id,
    shopping_order_line_id: order.order_lines[0].id,
    quantity: 1 as number & tags.Type<"int32">,
    item_business_reason: undefined,
    attachments: undefined,
  };
  const refundReqBody = {
    shopping_order_id: order.id,
    request_type: "refund",
    business_reason: "Test refund reason",
    request_context: undefined,
    items: [requestItem],
    attachments: undefined,
  } satisfies IShoppingRefundRequest.ICreate;
  const refund = await api.functional.shopping.customer.refunds.create(
    connection,
    { body: refundReqBody },
  );
  typia.assert(refund);

  // 7. Get status history: get a valid statusHistoryId
  const firstStatus = refund.status_histories[0];
  typia.assert(firstStatus);
  // Owner can access the refund status history (positive case)
  const statusHistory =
    await api.functional.shopping.customer.refunds.statuses.at(connection, {
      refundRequestId: refund.id,
      statusHistoryId: firstStatus.id,
    });
  typia.assert(statusHistory);
  TestValidator.equals(
    "refundRequestId matches",
    statusHistory.shopping_refund_request_id,
    refund.id,
  );
  TestValidator.equals(
    "statusHistoryId matches",
    statusHistory.id,
    firstStatus.id,
  );
  TestValidator.equals(
    "actor type matches",
    statusHistory.actor_type,
    firstStatus.actor_type,
  );
  TestValidator.equals(
    "actor id matches",
    statusHistory.shopping_actor_id,
    firstStatus.shopping_actor_id,
  );
  TestValidator.equals(
    "from status matches",
    statusHistory.previous_status,
    firstStatus.previous_status,
  );
  TestValidator.equals(
    "to status matches",
    statusHistory.new_status,
    firstStatus.new_status,
  );
  TestValidator.equals(
    "timestamp matches",
    statusHistory.timestamp,
    firstStatus.timestamp,
  );
  TestValidator.equals(
    "context matches",
    statusHistory.change_context,
    firstStatus.change_context,
  );

  // 8. Negative case: non-existent statusHistoryId
  await TestValidator.error(
    "non-existent refund status history entry triggers error",
    async () => {
      await api.functional.shopping.customer.refunds.statuses.at(connection, {
        refundRequestId: refund.id,
        statusHistoryId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
  // 9. Negative case: not owned refund, access forbidden (simulate by generating a new refund for a different customer)
  const anotherCustomerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(14),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://abc.com/join",
    referrer: "https://otherref.com/",
    ip: undefined,
  } satisfies IShoppingCustomer.ICreate;
  const anotherCustomer = await api.functional.auth.customer.join(connection, {
    body: anotherCustomerJoinBody,
  });
  typia.assert(anotherCustomer);
  // Try accessing as another customer: should error (not found/forbidden)
  await TestValidator.error(
    "other customer forbidden from accessing refund status history",
    async () => {
      await api.functional.shopping.customer.refunds.statuses.at(connection, {
        refundRequestId: refund.id,
        statusHistoryId: firstStatus.id,
      });
    },
  );
}
