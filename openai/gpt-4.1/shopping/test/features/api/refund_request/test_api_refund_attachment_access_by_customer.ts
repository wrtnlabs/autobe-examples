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
 * Validates that a customer who files a refund request can retrieve attachment
 * metadata for a file uploaded as evidence to their own refund claim.
 *
 * Scenario:
 *
 * 1. Register a new customer account
 * 2. Create a product as a seller (simulated, minimal - can be admin or seller
 *    context if necessary)
 * 3. Add a SKU for that product
 * 4. Customer creates an order for the SKU
 * 5. Customer files a refund request for the order
 * 6. Customer uploads an attachment as evidence to the refund request
 * 7. Customer retrieves the attachment metadata for the uploaded file and verifies
 *    correctness
 */
export async function test_api_refund_attachment_access_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const newCustomer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12) as string &
          tags.MinLength<8> &
          tags.MaxLength<128>,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://www.example.com/register",
        referrer: "https://www.example.com/landing",
        ip: undefined,
      } satisfies IShoppingCustomer.ICreate,
    });
  typia.assert(newCustomer);

  // 2. (Setup as seller - assume elevated context: mock seller session or direct product creation)
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(2),
        description: RandomGenerator.content({ paragraphs: 2 }),
        main_image_uri: "https://cdn.example.com/image.jpg",
        status: "active",
        business_status: "approved",
      } satisfies IShoppingProduct.ICreate,
    });
  typia.assert(product);

  // 3. Add SKU for product
  const sku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: product.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(10),
        price: 25000,
        is_active: true,
        barcode: undefined,
        status: "in_stock",
        // For testing: use any available attribute value or leave empty if none exist
        variant_attribute_value_ids: [],
      } satisfies IShoppingSku.ICreate,
    });
  typia.assert(sku);

  // 4. Customer creates an order for SKU
  const shippingAddress = {
    type: "shipping",
    recipient_name: newCustomer.name,
    recipient_phone: newCustomer.phone,
    zip_code: "04524",
    base_address: "123 Example St",
    detail_address: "Apt 101",
    city: "Seoul",
    state_province: "Seoul",
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
        coupon_code: undefined,
      } satisfies IShoppingOrder.ICreate,
    });
  typia.assert(order);

  // 5. Customer files a refund request for the order
  const refundRequest: IShoppingRefundRequest =
    await api.functional.shopping.customer.refunds.create(connection, {
      body: {
        shopping_order_id: order.id,
        request_type: "refund",
        business_reason: "Wrong item shipped",
        items: [
          {
            shopping_order_id: order.id,
            shopping_order_line_id: order.order_lines[0].id,
            quantity: 1,
          },
        ],
        // No attachments at creation
      } satisfies IShoppingRefundRequest.ICreate,
    });
  typia.assert(refundRequest);

  // 6. Customer uploads a refund attachment
  const attachmentBody = {
    attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
    attachment_type: "evidence",
    description: "Photo proof of issue",
    file_uri: "https://cdn.example.com/uploads/proof.jpg",
    file_type: "image/jpeg",
    file_size: 204800,
  } satisfies IShoppingRefundAttachment.ICreate;
  const uploadedAttachment: IShoppingRefundAttachment =
    await api.functional.shopping.customer.refunds.attachments.create(
      connection,
      {
        refundRequestId: refundRequest.id,
        body: attachmentBody,
      },
    );
  typia.assert(uploadedAttachment);

  // 7. Customer retrieves the uploaded attachment metadata and verifies it
  const attachment: IShoppingRefundAttachment =
    await api.functional.shopping.customer.refunds.attachments.at(connection, {
      refundRequestId: refundRequest.id,
      attachmentId: uploadedAttachment.id,
    });
  typia.assert(attachment);

  // Validate that the retrieved attachment matches what was uploaded
  TestValidator.equals(
    "retrieved refund attachment matches uploaded metadata",
    attachment,
    uploadedAttachment,
  );
}
