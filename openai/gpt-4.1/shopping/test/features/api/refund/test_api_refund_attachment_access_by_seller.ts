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
 * Verify that a seller can access attachment metadata for their refund request.
 *
 * This test covers the business rule that a seller who owns the product in an
 * order may access the file attachment metadata associated with refund requests
 * for that order. The workflow includes pre-requisite entity creation and
 * authentication for positive and negative access scenarios.
 *
 * Test Steps:
 *
 * 1. Register a seller (seller A).
 * 2. Seller A creates a product with a SKU.
 * 3. Register a customer and create an order purchasing Seller A's SKU.
 * 4. Seller A successfully creates a refund request on the order's line(s).
 * 5. Add an attachment to the refund request as admin (to enable access).
 * 6. Seller A retrieves the attachment metadata via the seller refund API.
 *    Validate response.
 * 7. Negative case: Register a second seller (seller B) and attempt to fetch the
 *    attachment metadata. Access should be denied.
 * 8. Negative case: Attempt unauthenticated access to the seller refund attachment
 *    API. Access should be denied.
 */
export async function test_api_refund_attachment_access_by_seller(
  connection: api.IConnection,
) {
  // 1. Register seller A
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerA: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerAEmail,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        contact_phone: RandomGenerator.mobile(),
        status: "pending",
      } satisfies IShoppingSeller.IJoin,
    });
  typia.assert(sellerA);

  // 2. Seller A creates a product
  const productCode = RandomGenerator.alphaNumeric(10);
  const product = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: {
        code: productCode,
        name: RandomGenerator.name(),
        description: RandomGenerator.content({ paragraphs: 1 }),
        main_image_uri: "https://example.com/image.jpg",
        status: "active",
        business_status: "approved",
      } satisfies IShoppingProduct.ICreate,
    },
  );
  typia.assert(product);

  // 3. Create a SKU under the product
  const sku = await api.functional.shopping.seller.products.skus.create(
    connection,
    {
      productCode: product.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        price: 10000,
        is_active: true,
        barcode: null,
        status: "in_stock",
        variant_attribute_value_ids: [
          typia.random<string & tags.Format<"uuid">>(),
        ],
      } satisfies IShoppingSku.ICreate,
    },
  );
  typia.assert(sku);

  // 4. Register a customer and create an order
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://buyer.com/checkout",
      referrer: "https://buyer.com/",
      ip: undefined,
    } satisfies IShoppingCustomer.ICreate,
  });
  typia.assert(customer);

  const address = {
    type: "shipping",
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    zip_code: RandomGenerator.alphaNumeric(5),
    base_address: RandomGenerator.paragraph({ sentences: 2 }),
    detail_address: null,
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    country: "KR",
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
          },
        ],
        shipping_addresses: [address],
        payment_method: "card",
        coupon_code: null,
      } satisfies IShoppingOrder.ICreate,
    },
  );
  typia.assert(order);

  // 5. Seller creates a refund request on the order
  const refundRequest = await api.functional.shopping.seller.refunds.create(
    connection,
    {
      body: {
        shopping_order_id: order.id,
        request_type: "refund",
        business_reason: "Test case refund",
        request_context: RandomGenerator.content({ paragraphs: 1 }),
        items: [
          {
            shopping_order_id: order.id,
            shopping_order_line_id: order.order_lines[0].id,
            quantity: 1,
            item_business_reason: null,
            attachments: undefined,
          },
        ],
        attachments: undefined,
      } satisfies IShoppingRefundRequest.ICreate,
    },
  );
  typia.assert(refundRequest);

  // 6. Admin attaches a file to the refund request
  const attachmentInput = {
    attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
    attachment_type: "evidence",
    description: "Test file attachment",
    shopping_refund_request_item_id: null,
    file_uri: "https://files.example.com/test-proof.jpg",
    file_type: "image/jpeg",
    file_size: 4096,
  } satisfies IShoppingRefundAttachment.ICreate;
  const refundAttachment =
    await api.functional.shopping.admin.refunds.attachments.create(connection, {
      refundRequestId: refundRequest.id,
      body: attachmentInput,
    });
  typia.assert(refundAttachment);

  // 7. Seller A retrieves the attachment metadata successfully
  const fetched = await api.functional.shopping.seller.refunds.attachments.at(
    connection,
    {
      refundRequestId: refundRequest.id,
      attachmentId: refundAttachment.id,
    },
  );
  typia.assert(fetched);
  TestValidator.equals(
    "attachment metadata matches",
    fetched,
    refundAttachment,
  );

  // 8. Register another seller (seller B) and try to access the attachment
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerB = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerBEmail,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    } satisfies IShoppingSeller.IJoin,
  });
  typia.assert(sellerB);
  await TestValidator.error(
    "other seller is denied from accessing attachment",
    async () => {
      await api.functional.shopping.seller.refunds.attachments.at(connection, {
        refundRequestId: refundRequest.id,
        attachmentId: refundAttachment.id,
      });
    },
  );

  // 9. Unauthenticated (no token) access attempt
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated access to attachment is denied",
    async () => {
      await api.functional.shopping.seller.refunds.attachments.at(unauthConn, {
        refundRequestId: refundRequest.id,
        attachmentId: refundAttachment.id,
      });
    },
  );
}
