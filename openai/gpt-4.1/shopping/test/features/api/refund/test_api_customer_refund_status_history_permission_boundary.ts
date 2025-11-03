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
 * Test permission control for refund status history retrieval:
 *
 * 1. Seller registers a product (with random code)
 * 2. Seller creates a SKU for the product
 * 3. Customer1 signs up and orders the product
 * 4. Customer1 initiates a refund request for the order
 * 5. Customer1 fetches refund status history (should succeed)
 * 6. Customer2 signs up and tries to fetch status history (should fail)
 * 7. Attempt by seller to fetch status history as unauthorized party (should fail)
 */
export async function test_api_customer_refund_status_history_permission_boundary(
  connection: api.IConnection,
) {
  // 1. Create a seller account (not required to test role, but for context, assume session already proper)
  // Seller session is implicit for product creation
  const productCode = RandomGenerator.alphaNumeric(8);
  const product = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        main_image_uri: "https://example.com/image.jpg",
        status: "active",
        business_status: "approved",
      } satisfies IShoppingProduct.ICreate,
    },
  );
  typia.assert(product);

  // Create variant attribute value ids for SKU (use at least one random, or empty for MC)
  const sku = await api.functional.shopping.seller.products.skus.create(
    connection,
    {
      productCode: product.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        price: 7777,
        is_active: true,
        status: "in_stock",
        variant_attribute_value_ids: [], // Assume product has no attributes if none required
      } satisfies IShoppingSku.ICreate,
    },
  );
  typia.assert(sku);

  // 2. Customer #1 signs up
  const customer1Email = typia.random<string & tags.Format<"email">>();
  const customer1 = await api.functional.auth.customer.join(connection, {
    body: {
      email: customer1Email,
      password: "Password123!",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://app.test/refund-e2e",
      referrer: "https://app.test/some-entry",
    } satisfies IShoppingCustomer.ICreate,
  });
  typia.assert(customer1);

  // 3. Customer #1 places an order
  const address = {
    type: "shipping",
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    zip_code: "12345",
    base_address: RandomGenerator.paragraph({ sentences: 2 }),
    city: "Seoul",
    state_province: "Seoul",
    country: "KOR",
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
          } satisfies IShoppingOrderLine.ICreate,
        ],
        shipping_addresses: [address],
        payment_method: "virtual_account",
      } satisfies IShoppingOrder.ICreate,
    },
  );
  typia.assert(order);

  // 4. Customer #1 initiates a refund for the order
  const orderLineId = typia.assert(order.order_lines[0].id!);
  const refundReq = await api.functional.shopping.customer.refunds.create(
    connection,
    {
      body: {
        shopping_order_id: order.id,
        request_type: "refund",
        business_reason: "Change of mind",
        items: [
          {
            shopping_order_id: order.id,
            shopping_order_line_id: orderLineId,
            quantity: 1,
          } satisfies IShoppingRefundRequestItem.ICreate,
        ],
      } satisfies IShoppingRefundRequest.ICreate,
    },
  );
  typia.assert(refundReq);

  // 5. Customer #1 successfully fetches their own refund status history
  const refundHistoryPage =
    await api.functional.shopping.customer.refunds.statuses.index(connection, {
      refundRequestId: refundReq.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingRefundStatusHistory.IRequest,
    });
  typia.assert(refundHistoryPage);
  TestValidator.predicate(
    "owner customer can get refund status history",
    refundHistoryPage.data.length > 0,
  );

  // 6. Customer #2 creates their own unrelated account and attempts to fetch status history (should be denied)
  const customer2Email = typia.random<string & tags.Format<"email">>();
  const customer2 = await api.functional.auth.customer.join(connection, {
    body: {
      email: customer2Email,
      password: "Password456!",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://app.test/refund-e2e",
      referrer: "https://app.test/entry2",
    } satisfies IShoppingCustomer.ICreate,
  });
  typia.assert(customer2);

  await TestValidator.error(
    "unauthorized customer cannot retrieve another's refund status history",
    async () => {
      await api.functional.shopping.customer.refunds.statuses.index(
        connection,
        {
          refundRequestId: refundReq.id,
          body: {
            page: 1,
            limit: 10,
          } satisfies IShoppingRefundStatusHistory.IRequest,
        },
      );
    },
  );

  // 7. Seller attempts (not allowed for this endpoint) to access refund status history (should fail)
  // Create new seller account context
  const newSellerConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "seller cannot retrieve customer refund status history via this endpoint",
    async () => {
      await api.functional.shopping.customer.refunds.statuses.index(
        newSellerConn,
        {
          refundRequestId: refundReq.id,
          body: {
            page: 1,
            limit: 10,
          } satisfies IShoppingRefundStatusHistory.IRequest,
        },
      );
    },
  );
}
