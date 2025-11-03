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
 * Test end-to-end creation and authorized customer deletion of a refund request
 * attachment.
 *
 * This scenario verifies that a customer can delete their own attachment from a
 * refund request workflow. It includes all required business steps:
 * registration, product/SKU creation, order/checkout, refund request, refund
 * attachment creation, and then authorized delete operation.
 *
 * Due to the current API set, post-deletion verification (e.g., reload refund
 * request to confirm missing attachment) is not implementable, because no
 * fetch/Get endpoint for refund request is exposed. We instead focus on
 * successful completion of deletion and prior data integrity. The test
 * confirms:
 *
 * 1. Customer registration and login.
 * 2. Product registration and SKU creation (with required variant attribute).
 * 3. Customer creates a valid order for the SKU with shipping address.
 * 4. Customer initiates a refund request for the order and line, using valid
 *    reason.
 * 5. Customer attaches a file/evidence to the refund request.
 * 6. Customer deletes the refund attachment with authorization.
 *
 * All operations are end-to-end, type safe, and follow real business
 * relationships. The deletion call is asserted for error-free completion.
 */
export async function test_api_refund_attachment_customer_deletion_authorized(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://customer.register/refund-attach-delete-test",
        referrer: "https://customer.referrer",
      } satisfies IShoppingCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Create a seller product (test context: customer is acting as seller -- single role for test)
  const productCode: string = RandomGenerator.alphaNumeric(10);
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        main_image_uri: "https://cdn.example.com/img/refund-delete.jpg",
        status: "active",
        business_status: "approved",
      } satisfies IShoppingProduct.ICreate,
    });
  typia.assert(product);

  // 3. Create a SKU for the product (with arbitrary attribute, as attributes are not listed in setup)
  const attributeValueId = typia.random<string & tags.Format<"uuid">>();
  const sku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: product.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(12),
        price: 10000,
        is_active: true,
        status: "in_stock",
        variant_attribute_value_ids: [attributeValueId],
      } satisfies IShoppingSku.ICreate,
    });
  typia.assert(sku);

  // 4. Customer places an order for the SKU
  const shippingAddress = {
    type: "shipping",
    recipient_name: customer.name,
    recipient_phone: customer.phone,
    zip_code: "12345",
    base_address: "123 RefundTest Ave",
    detail_address: null,
    city: "Seoul",
    state_province: "Gyeonggi",
    country: "South Korea",
  } satisfies IShoppingOrderAddress.ICreate;
  const orderLine = {
    shopping_sku_id: sku.id,
    quantity: 1,
    unit_price: sku.price,
  } satisfies IShoppingOrderLine.ICreate;
  const order: IShoppingOrder =
    await api.functional.shopping.customer.orders.create(connection, {
      body: {
        total_price: sku.price,
        order_lines: [orderLine],
        shipping_addresses: [shippingAddress],
        payment_method: "bank_transfer",
      } satisfies IShoppingOrder.ICreate,
    });
  typia.assert(order);

  // 5. Customer creates a refund request for the order
  const refundReq: IShoppingRefundRequest =
    await api.functional.shopping.customer.refunds.create(connection, {
      body: {
        shopping_order_id: order.id,
        request_type: "refund",
        business_reason: "defect found in item",
        items: [
          {
            shopping_order_id: order.id,
            shopping_order_line_id: order.order_lines[0].id,
            quantity: 1,
          } satisfies IShoppingRefundRequestItem.ICreate,
        ],
      } satisfies IShoppingRefundRequest.ICreate,
    });
  typia.assert(refundReq);

  // 6. Customer uploads an attachment for the refund request
  const refundAttachment: IShoppingRefundAttachment =
    await api.functional.shopping.customer.refunds.attachments.create(
      connection,
      {
        refundRequestId: refundReq.id,
        body: {
          attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
          attachment_type: "photo",
          description: "photo of defect",
          file_uri: "https://cdn.example.com/file/refund-defect-image.jpg",
          file_type: "image/jpeg",
          file_size: 2048,
        } satisfies IShoppingRefundAttachment.ICreate,
      },
    );
  typia.assert(refundAttachment);

  // 7. Customer deletes the attachment (authorized)
  await api.functional.shopping.customer.refunds.attachments.erase(connection, {
    refundRequestId: refundReq.id,
    attachmentId: refundAttachment.id,
  });
}
