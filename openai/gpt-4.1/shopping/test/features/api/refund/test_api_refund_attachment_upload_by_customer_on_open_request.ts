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
 * Test refund attachment upload by customer on their open request.
 *
 * 1. Register seller (unique email, password, display name, phone, status
 *    "pending").
 * 2. Seller creates product (code, name, description, image URI, status,
 *    business_status).
 * 3. Seller creates SKU for product (sku code, price, is_active, status,
 *    attributes).
 * 4. Register customer (unique email, password, name, phone, href/referrer).
 * 5. Customer creates order for that SKU (addresses, line items [sku], payment
 *    method).
 * 6. Customer creates refund request for one order line (request_type, reason,
 *    item).
 * 7. Customer uploads file attachment (ICreate: attachment_file_id,
 *    attachment_type, file_uri, file_type, file_size).
 * 8. Assert file metadata (matching refundRequestId, correct fields, valid types).
 * 9. Negative: try uploading to this refund as different customer, expect error.
 */
export async function test_api_refund_attachment_upload_by_customer_on_open_request(
  connection: api.IConnection,
) {
  // 1. Register seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "Password123!",
      display_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    } satisfies IShoppingSeller.IJoin,
  });
  typia.assert(seller);

  // 2. Seller creates product
  const productCode = RandomGenerator.alphaNumeric(10);
  const productMainImage =
    "https://cdn.example.com/product-" +
    RandomGenerator.alphaNumeric(8) +
    ".png";
  const product = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 8,
          sentenceMax: 16,
        }),
        main_image_uri: productMainImage,
        status: "active",
        business_status: "in_review",
      } satisfies IShoppingProduct.ICreate,
    },
  );
  typia.assert(product);

  // 3. Seller creates SKU (pick first product attribute if any, else make fake attribute ID)
  const attributeValueId =
    (product.attributes[0]?.attribute_value?.id as string &
      tags.Format<"uuid">) || typia.random<string & tags.Format<"uuid">>();
  const skuCode = RandomGenerator.alphaNumeric(8);
  const sku = await api.functional.shopping.seller.products.skus.create(
    connection,
    {
      productCode: product.code,
      body: {
        sku_code: skuCode,
        price: 10000,
        is_active: true,
        status: "in_stock",
        variant_attribute_value_ids: [attributeValueId],
      } satisfies IShoppingSku.ICreate,
    },
  );
  typia.assert(sku);

  // 4. Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "Password456!",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://shopper.home/flow",
      referrer: "https://shopper.landing",
      ip: null,
    } satisfies IShoppingCustomer.ICreate,
  });
  typia.assert(customer);

  // 5. Customer creates order for that SKU
  const shippingAddress = {
    type: "shipping",
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    zip_code: RandomGenerator.alphaNumeric(5),
    base_address: RandomGenerator.paragraph({ sentences: 2 }),
    city: "Seoul",
    state_province: "Seoul Special City",
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
            quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            unit_price: sku.price as number & tags.Minimum<0>,
          } satisfies IShoppingOrderLine.ICreate,
        ],
        shipping_addresses: [shippingAddress],
        payment_method: "credit_card",
      } satisfies IShoppingOrder.ICreate,
    },
  );
  typia.assert(order);
  TestValidator.equals("single order line", order.order_lines.length, 1);

  // 6. Customer creates refund request for one line
  const refundLineItem = order.order_lines[0];
  const refundRequest = await api.functional.shopping.customer.refunds.create(
    connection,
    {
      body: {
        shopping_order_id: order.id,
        request_type: "refund",
        business_reason: "Customer did not receive parcel",
        items: [
          {
            shopping_order_id: order.id,
            shopping_order_line_id: refundLineItem.id,
            quantity: 1,
          } satisfies IShoppingRefundRequestItem.ICreate,
        ],
      } satisfies IShoppingRefundRequest.ICreate,
    },
  );
  typia.assert(refundRequest);
  TestValidator.equals(
    "refund request must have order",
    refundRequest.order.id,
    order.id,
  );

  // 7. Customer uploads file attachment
  const fakeFileId = typia.random<string & tags.Format<"uuid">>();
  const fakeFileUri = `https://cdn.example.com/refund-file-${RandomGenerator.alphaNumeric(8)}.png`;
  const fakeMimeType = RandomGenerator.pick([
    "image/png",
    "image/jpeg",
    "application/pdf",
  ] as const);
  const fakeFileSize: number & tags.Type<"int32"> = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<10_000> & tags.Maximum<5_000_000>
  >();
  const attachment =
    await api.functional.shopping.customer.refunds.attachments.create(
      connection,
      {
        refundRequestId: refundRequest.id,
        body: {
          attachment_file_id: fakeFileId,
          attachment_type: "evidence",
          file_uri: fakeFileUri,
          file_type: fakeMimeType,
          file_size: fakeFileSize,
        } satisfies IShoppingRefundAttachment.ICreate,
      },
    );
  typia.assert(attachment);
  TestValidator.equals(
    "attachment refundRequestId matches",
    attachment.shopping_refund_request_id,
    refundRequest.id,
  );
  TestValidator.equals(
    "file_uri matches input",
    attachment.file_uri,
    fakeFileUri,
  );
  TestValidator.equals(
    "file_type matches input",
    attachment.file_type,
    fakeMimeType,
  );
  TestValidator.equals(
    "file_size matches input",
    attachment.file_size,
    fakeFileSize,
  );

  // 8. Negative: other customer cannot upload attachment
  const attackerEmail = typia.random<string & tags.Format<"email">>();
  const attacker = await api.functional.auth.customer.join(connection, {
    body: {
      email: attackerEmail,
      password: "Password789!",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://attacker.site",
      referrer: "https://external.ref",
      ip: null,
    } satisfies IShoppingCustomer.ICreate,
  });
  typia.assert(attacker);
  await TestValidator.error(
    "different customer cannot upload refund attachment",
    async () => {
      await api.functional.shopping.customer.refunds.attachments.create(
        connection,
        {
          refundRequestId: refundRequest.id,
          body: {
            attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
            attachment_type: "evidence",
            file_uri: `https://cdn.example.com/evil-file-${RandomGenerator.alphaNumeric(8)}.png`,
            file_type: RandomGenerator.pick([
              "image/png",
              "image/jpeg",
              "application/pdf",
            ] as const),
            file_size: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<10_000> &
                tags.Maximum<5_000_000>
            >(),
          } satisfies IShoppingRefundAttachment.ICreate,
        },
      );
    },
  );
}
