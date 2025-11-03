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
 * Validate seller uploads a valid attachment to an open refund request.
 *
 * 1. Register seller; 2. Create product; 3. Create SKU; 4. Register customer; 5.
 *    Customer places order; 6. Seller creates refund request; 7. Seller uploads
 *    attachment; 8. Verify metadata and linkage; 9. Attempt duplicate upload
 *    and verify no duplicate.
 */
export async function test_api_refund_attachment_upload_by_seller_on_open_request(
  connection: api.IConnection,
) {
  // 1. Register seller
  const sellerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerInput });
  typia.assert(seller);

  // 2. Create product
  const productCode = RandomGenerator.alphaNumeric(12);
  const productInput = {
    code: productCode,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    main_image_uri:
      "https://files.example-cdn.com/" +
      RandomGenerator.alphaNumeric(16) +
      ".png",
    status: "active",
    business_status: "in_review",
  } satisfies IShoppingProduct.ICreate;
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: productInput,
    });
  typia.assert(product);

  // 3. Create SKU (simplest valid, with one random attribute value id)
  const skuInput = {
    sku_code: RandomGenerator.alphaNumeric(16),
    price: 10000,
    is_active: true,
    status: "in_stock",
    variant_attribute_value_ids: [typia.random<string & tags.Format<"uuid">>()],
  } satisfies IShoppingSku.ICreate;
  const sku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuInput,
    });
  typia.assert(sku);

  // 4. Register customer
  const customerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://shopper-landing/welcome",
    referrer: "https://web-ad.com/banner/12",
    ip: "192.168.1.51",
  } satisfies IShoppingCustomer.ICreate;
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerInput,
    });
  typia.assert(customer);

  // 5. Customer orders SKU
  const orderInput = {
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
        zip_code: "12345",
        base_address: RandomGenerator.paragraph({ sentences: 2 }),
        city: RandomGenerator.name(1),
        state_province: RandomGenerator.name(1),
        country: "Testland",
      },
    ],
    payment_method: "virtual_bank",
  } satisfies IShoppingOrder.ICreate;
  const order: IShoppingOrder =
    await api.functional.shopping.customer.orders.create(connection, {
      body: orderInput,
    });
  typia.assert(order);

  // 6. Seller creates refund request for order
  const refundInput = {
    shopping_order_id: order.id,
    request_type: "refund",
    business_reason: "damaged item",
    items: [
      {
        shopping_order_id: order.id,
        shopping_order_line_id: order.order_lines[0].id,
        quantity: 1,
      },
    ],
  } satisfies IShoppingRefundRequest.ICreate;
  const refund: IShoppingRefundRequest =
    await api.functional.shopping.seller.refunds.create(connection, {
      body: refundInput,
    });
  typia.assert(refund);
  TestValidator.equals(
    "refund request linked to order",
    refund.order.id,
    order.id,
  );

  // 7. Seller uploads attachment
  const attachmentFileId = typia.random<string & tags.Format<"uuid">>();
  const fileUri = `https://files.example-cdn.com/${attachmentFileId}.jpg`;
  const attachmentInput = {
    attachment_file_id: attachmentFileId,
    attachment_type: "photo",
    file_uri: fileUri,
    file_type: "image/jpeg",
    file_size: 216245,
  } satisfies IShoppingRefundAttachment.ICreate;
  const attachment: IShoppingRefundAttachment =
    await api.functional.shopping.seller.refunds.attachments.create(
      connection,
      {
        refundRequestId: refund.id,
        body: attachmentInput,
      },
    );
  typia.assert(attachment);
  TestValidator.equals(
    "attachment belongs to refund",
    attachment.shopping_refund_request_id,
    refund.id,
  );
  TestValidator.equals(
    "attachment file_uri matches",
    attachment.file_uri,
    fileUri,
  );
  TestValidator.equals(
    "attachment file_type",
    attachment.file_type,
    "image/jpeg",
  );
  TestValidator.equals("attachment file_size", attachment.file_size, 216245);

  // 8. Attempt duplicate upload (should not create duplicate)
  await TestValidator.error(
    "duplicate attachment upload does not create duplicate",
    async () => {
      await api.functional.shopping.seller.refunds.attachments.create(
        connection,
        {
          refundRequestId: refund.id,
          body: attachmentInput,
        },
      );
    },
  );
}
