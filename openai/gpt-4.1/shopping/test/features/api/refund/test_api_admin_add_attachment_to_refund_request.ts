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
 * Validate admin upload of attachment to an existing refund request.
 *
 * This test simulates the following workflow:
 *
 * 1. Register a new admin user for authentication context.
 * 2. Register a new customer who will place an order.
 * 3. Create a new product as seller and add a SKU for ordering.
 * 4. Customer places an order for the product SKU.
 * 5. Admin creates a refund request for the recent customer order.
 * 6. Admin uploads (registers) an attachment for the refund request.
 * 7. Verify that the attachment is properly linked to the refund request and the
 *    metadata (file, type, size) matches expectations.
 */
export async function test_api_admin_add_attachment_to_refund_request(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        role: "support", // Example role (min 2, max 32 chars)
        status: "active", // Acceptable status per business rules
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://app.example.com/auth/register",
        referrer: "https://app.example.com/landing",
      } satisfies IShoppingCustomer.ICreate,
    });
  typia.assert(customer);

  // 3. Seller creates product and SKU
  // For test, let's simulate that the test admin acts as the seller to setup product/SKU (or use pre-existing credentials in practice)
  const productCode = RandomGenerator.alphaNumeric(8);
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 6 }),
        main_image_uri: `https://cdn.example.com/image/${RandomGenerator.alphaNumeric(8)}.png`,
        status: "active",
        business_status: "approved",
        shipping_weight_grams: 300,
        shipping_length_cm: 10,
        shipping_width_cm: 8,
        shipping_height_cm: 4,
        shipping_options: "standard",
      } satisfies IShoppingProduct.ICreate,
    });
  typia.assert(product);
  const skuAttrId =
    product.attributes.length > 0
      ? product.attributes[0].attribute_value.id
      : typia.random<string & tags.Format<"uuid">>();
  const sku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: product.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(10),
        price: 55000,
        is_active: true,
        barcode: null,
        status: "in_stock",
        variant_attribute_value_ids: [skuAttrId],
      } satisfies IShoppingSku.ICreate,
    });
  typia.assert(sku);

  // 4. Customer places an order for SKU
  const order: IShoppingOrder =
    await api.functional.shopping.customer.orders.create(connection, {
      body: {
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
            zip_code: RandomGenerator.alphaNumeric(5),
            base_address: RandomGenerator.paragraph({ sentences: 2 }),
            detail_address: RandomGenerator.paragraph({ sentences: 2 }),
            city: "Seoul",
            state_province: "Seoul",
            country: "South Korea",
          },
        ],
        payment_method: "card",
      } satisfies IShoppingOrder.ICreate,
    });
  typia.assert(order);

  // 5. Admin creates refund request for this order
  const refundItemReq: IShoppingRefundRequestItem.ICreate = {
    shopping_order_id: order.id,
    shopping_order_line_id: order.order_lines[0].id,
    quantity: 1,
    item_business_reason: "faulty product",
    attachments: [],
  };
  const refundReq: IShoppingRefundRequest =
    await api.functional.shopping.admin.refunds.create(connection, {
      body: {
        shopping_order_id: order.id,
        request_type: "refund",
        business_reason: "customer reported issue with product",
        request_context: "urgent customer escalation for refund",
        items: [refundItemReq],
        attachments: [],
      } satisfies IShoppingRefundRequest.ICreate,
    });
  typia.assert(refundReq);

  // 6. Admin adds an attachment to the refund request
  // Simulate file upload reference
  const attachmentFileId = typia.random<string & tags.Format<"uuid">>();
  const fileUri = `https://cdn.example.com/refunds/${attachmentFileId}.pdf`;
  const fileType = RandomGenerator.pick([
    "application/pdf",
    "image/png",
    "image/jpeg",
  ] as const);
  const fileSize = 102400; // 100 KB
  const attachmentReq: IShoppingRefundAttachment.ICreate = {
    attachment_file_id: attachmentFileId,
    attachment_type: "evidence",
    description: "Proof of product defect for compliance.",
    shopping_refund_request_item_id: null,
    file_uri: fileUri,
    file_type: fileType,
    file_size: fileSize,
  };
  const out: IShoppingRefundAttachment =
    await api.functional.shopping.admin.refunds.attachments.create(connection, {
      refundRequestId: refundReq.id,
      body: attachmentReq,
    });
  typia.assert(out);

  // 7. Validate attachment linkage and metadata
  TestValidator.equals(
    "correct refund request linkage",
    out.shopping_refund_request_id,
    refundReq.id,
  );
  TestValidator.equals("file uri is correct", out.file_uri, fileUri);
  TestValidator.equals("file type is correct", out.file_type, fileType);
  TestValidator.equals("file size is correct", out.file_size, fileSize);
  TestValidator.equals(
    "attachment type is correct",
    out.attachment_type,
    "evidence",
  );
  TestValidator.equals(
    "description is correct",
    out.description,
    "Proof of product defect for compliance.",
  );
}
