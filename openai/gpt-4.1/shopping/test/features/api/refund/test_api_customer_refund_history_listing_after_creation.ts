import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingRefundRequest";
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
 * Validates retrieval of the customer refund/cancellation requests list
 * (history) after creating a new refund request.
 *
 * 1. Register a seller account.
 * 2. Register a product for the seller.
 * 3. Create a SKU for the product.
 * 4. Register a customer account.
 * 5. Customer creates an order for the product/SKU.
 * 6. Customer submits a refund request for the just created order/line.
 * 7. Fetch refund request list (paginated and filtered) for the customer. Confirm
 *    that the new refund request appears in the result with correct pagination
 *    and filter logic.
 * 8. Validate that the refund request data matches creation and the pagination
 *    logic is correct.
 */
export async function test_api_customer_refund_history_listing_after_creation(
  connection: api.IConnection,
) {
  // 1. Register a seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        display_name: RandomGenerator.name(),
        contact_phone: RandomGenerator.mobile(),
        status: "pending",
      } satisfies IShoppingSeller.IJoin,
    });
  typia.assert(seller);

  // 2. Register a product (for seller)
  const productCode = RandomGenerator.alphaNumeric(10);
  const productCreate = {
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 4,
      sentenceMax: 7,
    }),
    main_image_uri: "https://example.com/product.jpg",
    status: "active",
    business_status: "approved",
    shipping_weight_grams: 900,
    shipping_length_cm: 20,
    shipping_width_cm: 30,
    shipping_height_cm: 12,
    shipping_options: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingProduct.ICreate;
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: productCreate,
    });
  typia.assert(product);

  // 3. Create a SKU for the product
  const skuCode = RandomGenerator.alphaNumeric(10);
  const sku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: product.code,
      body: {
        sku_code: skuCode,
        price: 20000,
        is_active: true,
        status: "in_stock",
        variant_attribute_value_ids: [],
      } satisfies IShoppingSku.ICreate,
    });
  typia.assert(sku);

  // 4. Register a customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://shop.test/register",
        referrer: "https://shop.test/home",
      } satisfies IShoppingCustomer.ICreate,
    });
  typia.assert(customer);

  // 5. Customer creates an order for the product/SKU
  const order: IShoppingOrder =
    await api.functional.shopping.customer.orders.create(connection, {
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
            recipient_name: RandomGenerator.name(),
            recipient_phone: RandomGenerator.mobile(),
            zip_code: "12345",
            base_address: RandomGenerator.paragraph({
              sentences: 1,
              wordMin: 5,
              wordMax: 10,
            }),
            detail_address: null,
            city: "Seoul",
            state_province: "Seoul",
            country: "South Korea",
          } satisfies IShoppingOrderAddress.ICreate,
        ],
        payment_method: "credit_card",
        coupon_code: null,
      } satisfies IShoppingOrder.ICreate,
    });
  typia.assert(order);

  // 6. Customer submits a refund request for the created order/line
  const refundReason = RandomGenerator.paragraph({ sentences: 2 });
  const refundRequest: IShoppingRefundRequest =
    await api.functional.shopping.customer.refunds.create(connection, {
      body: {
        shopping_order_id: order.id,
        request_type: "refund",
        business_reason: refundReason,
        request_context: null,
        items: [
          {
            shopping_order_id: order.id,
            shopping_order_line_id: order.order_lines[0].id,
            quantity: 1,
            item_business_reason: null,
            attachments: undefined,
          } satisfies IShoppingRefundRequestItem.ICreate,
        ],
        attachments: undefined,
      } satisfies IShoppingRefundRequest.ICreate,
    });
  typia.assert(refundRequest);

  // 7. Fetch refund request list with filter (only refunds for this order — the one just created)
  const refundList: IPageIShoppingRefundRequest.ISummary =
    await api.functional.shopping.customer.refunds.index(connection, {
      body: {
        request_type: "refund",
        order_id: order.id,
        page: 1,
        limit: 10,
        order_by: "created_at",
        order_direction: "desc",
      } satisfies IShoppingRefundRequest.IRequest,
    });
  typia.assert(refundList);
  TestValidator.predicate(
    "at least one refund request appears after creation",
    refundList.data.length > 0,
  );
  const foundRefund = refundList.data.find((r) => r.id === refundRequest.id);
  TestValidator.predicate(
    "created refund request is present in listing",
    !!foundRefund,
  );

  // 8. Validate search and pagination: does refund item match submitted data?
  if (foundRefund) {
    TestValidator.equals(
      "refund order matches order",
      foundRefund.order.id,
      order.id,
    );
    TestValidator.equals(
      "refund request type matches",
      foundRefund.request_type,
      "refund",
    );
    TestValidator.equals(
      "refund request status",
      typeof foundRefund.status,
      "string",
    );
    TestValidator.equals(
      "refund business reason matches",
      foundRefund.business_reason,
      refundReason,
    );
    TestValidator.equals(
      "refund actor is the requesting customer",
      foundRefund.actor.id,
      customer.id,
    );
    TestValidator.predicate(
      "refund item array exists and not empty",
      Array.isArray(foundRefund.items) && foundRefund.items.length > 0,
    );
    TestValidator.equals(
      "refund request includes affected order line",
      foundRefund.items[0].order_line_id,
      order.order_lines[0].id,
    );
  }
}
