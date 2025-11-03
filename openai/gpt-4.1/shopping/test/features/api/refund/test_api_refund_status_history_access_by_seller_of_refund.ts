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
 * Validate seller access and visibility over refund status history entry
 * related to their own products and orders.
 *
 * 1. Register a seller.
 * 2. Seller creates a product with a unique code.
 * 3. Seller adds a SKU variant for that product with required active status and
 *    variant attributes.
 * 4. Register a customer.
 * 5. Customer creates an order purchasing the seller's SKU.
 * 6. Customer creates a refund request for the purchased order/line.
 * 7. As seller, retrieve the refund status history item (should be accessible).
 * 8. Register a second, unrelated seller.
 * 9. Attempt to retrieve the same refund status history as unrelated seller
 *    (should be denied).
 */
export async function test_api_refund_status_history_access_by_seller_of_refund(
  connection: api.IConnection,
) {
  // 1. Register seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "sellerPwd123!",
      display_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    } satisfies IShoppingSeller.IJoin,
  });
  typia.assert(seller);

  // 2. Seller creates product
  const productCode = RandomGenerator.alphaNumeric(10);
  const product = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: {
        code: productCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 8 }),
        main_image_uri:
          "https://picsum.photos/seed/" +
          RandomGenerator.alphaNumeric(6) +
          "/600/600",
        status: "active",
        business_status: "in_review",
      } satisfies IShoppingProduct.ICreate,
    },
  );
  typia.assert(product);

  // 3. Seller creates SKU - supply at least one variant_attribute_value_id (simulate random uuid)
  const skuCode = RandomGenerator.alphaNumeric(12);
  const sku = await api.functional.shopping.seller.products.skus.create(
    connection,
    {
      productCode: productCode,
      body: {
        sku_code: skuCode,
        price: 10000,
        is_active: true,
        status: "in_stock",
        variant_attribute_value_ids: [
          typia.random<string & tags.Format<"uuid">>(),
        ],
      } satisfies IShoppingSku.ICreate,
    },
  );
  typia.assert(sku);

  // 4. Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "customerPwd123!",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://fake-origin.com/register",
      referrer: "https://fake-ref.com/landing",
      ip: undefined,
    } satisfies IShoppingCustomer.ICreate,
  });
  typia.assert(customer);

  // 5. Customer creates order for seller's SKU
  const shippingAddress = {
    type: "shipping",
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    zip_code: RandomGenerator.alphaNumeric(5),
    base_address: RandomGenerator.paragraph({ sentences: 2 }),
    detail_address: null,
    city: "Seoul",
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
          } satisfies IShoppingOrderLine.ICreate,
        ],
        shipping_addresses: [shippingAddress],
        payment_method: "credit_card",
        coupon_code: null,
      } satisfies IShoppingOrder.ICreate,
    },
  );
  typia.assert(order);

  // 6. Customer submits refund request for the order
  const refundRequest = await api.functional.shopping.customer.refunds.create(
    connection,
    {
      body: {
        shopping_order_id: order.id,
        request_type: "refund",
        business_reason: "Test automatic refund request for e2e",
        items: [
          {
            shopping_order_id: order.id,
            shopping_order_line_id: order.order_lines[0].id,
            quantity: 1,
          } satisfies IShoppingRefundRequestItem.ICreate,
        ],
        // attachments omitted (optional param)
      } satisfies IShoppingRefundRequest.ICreate,
    },
  );
  typia.assert(refundRequest);

  // 7. Retrieve first available refund status history as seller
  const statusHistories = refundRequest.status_histories;
  TestValidator.predicate(
    "refund status_histories array must exist and have at least one record",
    Array.isArray(statusHistories) && statusHistories.length > 0,
  );
  const picked = statusHistories[0];

  // As seller, retrieve the status history
  const history = await api.functional.shopping.seller.refunds.statuses.at(
    connection,
    {
      refundRequestId: refundRequest.id,
      statusHistoryId: picked.id,
    },
  );
  typia.assert(history);
  TestValidator.equals(
    "status history retrieved by actual seller matches reference",
    history,
    picked,
  );

  // 8. Register unrelated seller
  const otherSellerEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.seller.join(connection, {
    body: {
      email: otherSellerEmail,
      password: "sellerPwd123!",
      display_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    } satisfies IShoppingSeller.IJoin,
  });

  // 9. As unrelated seller, attempt to retrieve status history (should fail)
  await TestValidator.error(
    "unrelated seller must not be able to access other's refund status history",
    async () => {
      await api.functional.shopping.seller.refunds.statuses.at(connection, {
        refundRequestId: refundRequest.id,
        statusHistoryId: picked.id,
      });
    },
  );
}
