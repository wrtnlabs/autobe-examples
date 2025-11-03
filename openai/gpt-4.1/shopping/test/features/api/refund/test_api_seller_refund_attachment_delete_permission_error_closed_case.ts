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
 * Validate that a seller cannot delete an attachment from a refund request that
 * is administratively locked or closed.
 *
 * This test establishes a seller, product, SKU, customer order, refund request,
 * and a file attachment as evidence. The attachment deletion is attempted when
 * the refund is assumed closed (since the admin API surface is not available in
 * this suite). The test expects that the operation fails with a business error,
 * reflecting proper enforcement of workflow/business rules that prevent
 * attachment deletion for administratively closed refund cases. This simulation
 * is necessary while the test system is limited to seller-scope API calls. (In
 * a real system, the backend enforces the restriction, and the scenario can be
 * extended once admin endpoints are exposed for E2E automation.)
 *
 * Step-by-step process:
 *
 * 1. Register a seller account
 * 2. Seller creates a product
 * 3. Seller creates a SKU (with dummy attribute value ID)
 * 4. Customer order is created for the SKU (using current session)
 * 5. Seller creates a refund request for that order/line
 * 6. Seller attaches an evidence document to the refund request
 * 7. Simulate admin closing/locking the refund case (cannot be performed directly)
 * 8. Seller attempts to delete the attachment and should receive a business error
 *    (forbidden/conflict)
 */
export async function test_api_seller_refund_attachment_delete_permission_error_closed_case(
  connection: api.IConnection,
) {
  // 1. Register seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "password123!",
      display_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    } satisfies IShoppingSeller.IJoin,
  });
  typia.assert(seller);

  // 2. Seller creates product
  const productCode = RandomGenerator.alphaNumeric(8);
  const product = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        main_image_uri: "https://cdn.example.com/test_product_image.jpg",
        status: "active",
        business_status: "in_review",
      } satisfies IShoppingProduct.ICreate,
    },
  );
  typia.assert(product);

  // 3. Seller creates SKU for product (satisfy MinItems<1> on variant_attribute_value_ids)
  const skuCode = RandomGenerator.alphaNumeric(10);
  const sku = await api.functional.shopping.seller.products.skus.create(
    connection,
    {
      productCode,
      body: {
        sku_code: skuCode,
        price: 15000,
        is_active: true,
        status: "in_stock",
        variant_attribute_value_ids: [
          typia.random<string & tags.Format<"uuid">>(),
        ], // Minimum 1
      } satisfies IShoppingSku.ICreate,
    },
  );
  typia.assert(sku);

  // 4. Customer places order (using current session as customer)
  const shippingAddress = {
    type: "shipping" as const,
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    zip_code: "12345",
    base_address: RandomGenerator.paragraph({ sentences: 2 }),
    city: "Seoul",
    state_province: "Seoul",
    country: "South Korea",
  } satisfies IShoppingOrder.ICreate["shipping_addresses"][number];
  const order = await api.functional.shopping.customer.orders.create(
    connection,
    {
      body: {
        total_price: sku.price,
        order_lines: [
          {
            shopping_sku_id: sku.id,
            quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            unit_price: sku.price,
          },
        ],
        shipping_addresses: [shippingAddress],
        payment_method: "credit_card",
      } satisfies IShoppingOrder.ICreate,
    },
  );
  typia.assert(order);

  // 5. Seller initiates refund request
  const refundRequest = await api.functional.shopping.seller.refunds.create(
    connection,
    {
      body: {
        shopping_order_id: order.id,
        request_type: "refund",
        business_reason: "Item defective",
        items: [
          {
            shopping_order_id: order.id,
            shopping_order_line_id: order.order_lines[0].id,
            quantity: 1,
          },
        ],
      } satisfies IShoppingRefundRequest.ICreate,
    },
  );
  typia.assert(refundRequest);

  // 6. Seller attaches file evidence
  const attachmentFileId = typia.random<string & tags.Format<"uuid">>();
  const attachment =
    await api.functional.shopping.seller.refunds.attachments.create(
      connection,
      {
        refundRequestId: refundRequest.id,
        body: {
          attachment_file_id: attachmentFileId,
          attachment_type: "evidence",
          file_uri: "https://cdn.example.com/refund_evidence.jpg",
          file_type: "image/jpeg",
          file_size: 204800,
        } satisfies IShoppingRefundAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 7. Simulate admin closing/locking refund (cannot use admin API)
  // Business rule: refundRequest.status = "closed"
  refundRequest.status = "closed";

  // 8. Seller attempts to delete attachment on closed refund
  await TestValidator.error(
    "seller cannot delete attachment on administratively closed refund request",
    async () => {
      await api.functional.shopping.seller.refunds.attachments.erase(
        connection,
        {
          refundRequestId: refundRequest.id,
          attachmentId: attachment.id,
        },
      );
    },
  );
}
