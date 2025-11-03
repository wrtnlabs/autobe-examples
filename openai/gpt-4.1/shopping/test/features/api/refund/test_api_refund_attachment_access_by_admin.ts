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

export async function test_api_refund_attachment_access_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a seller.
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "SellerPass123$",
        display_name: RandomGenerator.name(),
        contact_phone: RandomGenerator.mobile(),
        status: "pending",
      },
    });
  typia.assert(seller);

  // 2. Register a product as the seller.
  const productCode = RandomGenerator.alphaNumeric(12);
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 6 }),
        main_image_uri: `https://cdn.example.com/images/${RandomGenerator.alphaNumeric(10)}.jpg`,
        status: "draft",
        business_status: "in_review",
      },
    });
  typia.assert(product);

  // 3. Register a SKU for the product.
  const sku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: product.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(10),
        price: 10000,
        is_active: true,
        status: "in_stock",
        variant_attribute_value_ids: [], // Skipping attributes for simplicity
      },
    });
  typia.assert(sku);

  // 4. Register a customer.
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "CustomerPass123$",
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: `https://shop.example.com/register`,
        referrer: `https://shop.example.com/landing`,
        ip: null,
      },
    });
  typia.assert(customer);

  // 5. Place an order as the customer.
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
            base_address: "123 Test Street",
            detail_address: null,
            city: "Seoul",
            state_province: "Seoul",
            country: "South Korea",
          },
        ],
        payment_method: "test_card",
        coupon_code: null,
      },
    });
  typia.assert(order);

  // 6. Register an admin.
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass123$",
        name: RandomGenerator.name(),
        role: "super",
        status: "active",
      },
    });
  typia.assert(admin);

  // 7. Admin creates a refund request for the order.
  const refundRequest: IShoppingRefundRequest =
    await api.functional.shopping.admin.refunds.create(connection, {
      body: {
        shopping_order_id: order.id,
        request_type: "refund",
        business_reason: "Test refund request",
        items: [
          {
            shopping_order_id: order.id,
            shopping_order_line_id: order.order_lines[0].id,
            quantity: 1,
            item_business_reason: null,
            attachments: [],
          },
        ],
        attachments: [],
      },
    });
  typia.assert(refundRequest);

  // 8. Admin uploads an attachment to the refund request.
  // For file asset, create metadata -- fake a file id, uri, type, and size.
  const attachmentFileId = typia.random<string & tags.Format<"uuid">>();
  const fileUri = `https://files.example.com/${attachmentFileId}/doc.pdf`;
  const fileType = "application/pdf";
  const fileSize = 2048;
  const attachment: IShoppingRefundAttachment =
    await api.functional.shopping.admin.refunds.attachments.create(connection, {
      refundRequestId: refundRequest.id,
      body: {
        attachment_file_id: attachmentFileId,
        attachment_type: "invoice",
        description: "Test refund evidence",
        shopping_refund_request_item_id: null,
        file_uri: fileUri,
        file_type: fileType,
        file_size: fileSize,
      },
    });
  typia.assert(attachment);

  // 9. Admin accesses the attachment via the API.
  const metadata: IShoppingRefundAttachment =
    await api.functional.shopping.admin.refunds.attachments.at(connection, {
      refundRequestId: refundRequest.id,
      attachmentId: attachment.id,
    });
  typia.assert(metadata);

  // 10. Validate the file metadata fields.
  TestValidator.equals("attachment file_uri", metadata.file_uri, fileUri);
  TestValidator.equals("attachment file_type", metadata.file_type, fileType);
  TestValidator.equals("attachment file_size", metadata.file_size, fileSize);
  TestValidator.equals(
    "attachment refund request linkage",
    metadata.shopping_refund_request_id,
    refundRequest.id,
  );

  // 11. Validate access denied when not authenticated (simulate unauthenticated conn).
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated admin cannot access attachment metadata",
    async () => {
      await api.functional.shopping.admin.refunds.attachments.at(unauthConn, {
        refundRequestId: refundRequest.id,
        attachmentId: attachment.id,
      });
    },
  );
}
