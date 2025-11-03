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

/**
 * Test retrieval of refund status history as customer.
 *
 * 1. Register a new customer, saving their info for authentication context.
 * 2. Register a seller, create a product under the seller.
 * 3. Add at least one SKU with random attribute values for the product.
 * 4. Place an order as the customer for the created SKU. Complete minimal required
 *    addresses.
 * 5. Create a refund request for the order as the customer (specifying order line
 *    and valid reason).
 * 6. Retrieve refund status history using the allowed API and validate:
 *
 *    - Status history entries are ordered chronologically
 *    - Status transitions cover submitted (at minimum)
 *    - The refund customer actor is visible and correct
 *    - Business metadata (status, timestamps) are present and correctly typed
 * 7. Validate access by confirming all information is returned as allowed, and
 *    that the set of status transitions matches expectations (business
 *    required
 *
 *    - Any system-injected transitions).
 */
export async function test_api_customer_refund_status_history_retrieval(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: `https://test${RandomGenerator.alphaNumeric(8)}.io`,
      referrer: `https://ref${RandomGenerator.alphaNumeric(5)}.io`,
      ip: undefined,
    } satisfies IShoppingCustomer.ICreate,
  });
  typia.assert(customer);

  // 2. Seller product & 3. SKU creation
  const product = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        main_image_uri: `https://images${RandomGenerator.alphaNumeric(8)}.cdn.io/img.png`,
        status: "active",
        business_status: "in_review",
      } satisfies IShoppingProduct.ICreate,
    },
  );
  typia.assert(product);

  // 3. SKU creation: Use first attribute value in first product attribute as variant if available, else just random
  // We'll just invent a single attribute value ID for test (since attribute linkage not surfaced in test scope)
  const skuCode = RandomGenerator.alphaNumeric(8);
  const sku = await api.functional.shopping.seller.products.skus.create(
    connection,
    {
      productCode: product.code,
      body: {
        sku_code: skuCode,
        price: 10000,
        is_active: true,
        barcode: undefined,
        status: "in_stock",
        variant_attribute_value_ids: [
          typia.random<string & tags.Format<"uuid">>(),
        ],
      } satisfies IShoppingSku.ICreate,
    },
  );
  typia.assert(sku);

  // 4. Place order
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
          } satisfies IShoppingOrderLine.ICreate,
        ],
        shipping_addresses: [
          {
            type: "shipping",
            recipient_name: customer.name,
            recipient_phone: customer.phone,
            zip_code: "12345",
            base_address: "123 Test Road",
            city: "Seoul",
            state_province: "Seoul",
            country: "KR",
          } satisfies IShoppingOrderAddress.ICreate,
        ],
        payment_method: "card",
      } satisfies IShoppingOrder.ICreate,
    },
  );
  typia.assert(order);

  // 5. Initiate refund request for the order (for first line)
  const refund = await api.functional.shopping.customer.refunds.create(
    connection,
    {
      body: {
        shopping_order_id: order.id,
        request_type: "refund",
        business_reason: RandomGenerator.paragraph({ sentences: 1 }),
        items: [
          {
            shopping_order_id: order.id,
            shopping_order_line_id: order.order_lines[0].id,
            quantity: 1,
          } satisfies IShoppingRefundRequestItem.ICreate,
        ],
        attachments: undefined,
      } satisfies IShoppingRefundRequest.ICreate,
    },
  );
  typia.assert(refund);

  // 6. Retrieve refund status history (PATCH API)
  const page: IPageIShoppingRefundStatusHistory =
    await api.functional.shopping.customer.refunds.statuses.index(connection, {
      refundRequestId: refund.id,
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IShoppingRefundStatusHistory.IRequest,
    });
  typia.assert(page);

  // 7. Validate—chronological order, inclusion of at least the submitted status, correct actor
  const ids = page.data.map((item) => item.id);
  TestValidator.equals(
    "all refund status history event IDs are unique",
    new Set(ids).size,
    ids.length,
  );

  TestValidator.equals(
    "requestor's actor_type is 'customer' in refund status entries",
    page.data.some((h) => h.actor_type === "customer"),
    true,
  );

  TestValidator.predicate(
    "status history is sorted chronologically by timestamp",
    page.data.every(
      (x, idx, arr) => idx === 0 || arr[idx - 1].timestamp <= x.timestamp,
    ),
  );

  TestValidator.equals(
    "at least one transition is 'pending' or 'submitted' to another status",
    page.data.some((x) => ["pending", "submitted"].includes(x.previous_status)),
    true,
  );

  TestValidator.predicate(
    "every status transition has an occurred timestamp",
    page.data.every((h) => !!h.timestamp),
  );
}
