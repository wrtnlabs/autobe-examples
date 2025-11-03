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

export async function test_api_admin_view_refund_request_details_success(
  connection: api.IConnection,
) {
  // 1. Seller registers
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerResult = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    },
  });
  typia.assert(sellerResult);

  // 2. Seller creates product
  const productCode = RandomGenerator.alphaNumeric(10);
  const product = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        main_image_uri:
          "https://cdn.example.com/prod" +
          RandomGenerator.alphaNumeric(5) +
          ".jpg",
        status: "active",
        business_status: "approved",
      },
    },
  );
  typia.assert(product);

  // 3. Seller creates SKU for product
  const skuCode = RandomGenerator.alphaNumeric(12);
  const sku = await api.functional.shopping.seller.products.skus.create(
    connection,
    {
      productCode: productCode,
      body: {
        sku_code: skuCode,
        price: 19900,
        is_active: true,
        status: "in_stock",
        variant_attribute_value_ids: [], // no attribute variants
      },
    },
  );
  typia.assert(sku);

  // 4. Customer registers
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerResult = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(14),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://shopper-landing.com" + RandomGenerator.alphaNumeric(4),
      referrer: "https://shopper-main.com",
    },
  });
  typia.assert(customerResult);

  // 5. Customer places an order for the SKU
  const shippingAddress = {
    type: "shipping",
    recipient_name: customerResult.name,
    recipient_phone: RandomGenerator.mobile(),
    zip_code: RandomGenerator.alphaNumeric(5),
    base_address: RandomGenerator.paragraph({ sentences: 1 }),
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
          },
        ],
        shipping_addresses: [shippingAddress],
        payment_method: "credit_card",
      },
    },
  );
  typia.assert(order);

  // 6. Customer creates a refund request
  const refundReq = await api.functional.shopping.customer.refunds.create(
    connection,
    {
      body: {
        shopping_order_id: order.id,
        request_type: "refund",
        business_reason: "customer_remorse",
        items: [
          {
            shopping_order_id: order.id,
            shopping_order_line_id: order.order_lines[0].id,
            quantity: 1,
          },
        ],
        attachments: [
          {
            attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
            attachment_type: "evidence",
            file_uri:
              "https://cdn.example.com/evidence" +
              RandomGenerator.alphaNumeric(5) +
              ".jpg",
            file_type: "image/jpeg",
            file_size: 23456,
          },
        ],
      },
    },
  );
  typia.assert(refundReq);

  // 7. Register an admin for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(14),
      name: RandomGenerator.name(),
      role: "super",
      status: "active",
    },
  });
  typia.assert(admin);

  // 8. Admin retrieves refund request details
  const adminRefund = await api.functional.shopping.admin.refunds.at(
    connection,
    {
      refundRequestId: refundReq.id,
    },
  );
  typia.assert(adminRefund);
  // Validate that expected properties are present
  TestValidator.equals(
    "refund order id matches",
    adminRefund.order.id,
    order.id,
  );
  TestValidator.equals(
    "refund actor matches customer",
    adminRefund.actor.id,
    customerResult.id,
  );
  TestValidator.equals(
    "refund items array exists",
    Array.isArray(adminRefund.items),
    true,
  );
  TestValidator.equals(
    "refund attachments array exists",
    Array.isArray(adminRefund.attachments),
    true,
  );
  TestValidator.equals(
    "refund status_histories array exists",
    Array.isArray(adminRefund.status_histories),
    true,
  );
  TestValidator.equals(
    "refund approvals exists",
    Array.isArray(adminRefund.approvals),
    true,
  );
  TestValidator.equals(
    "admin_overrides exists",
    Array.isArray(adminRefund.admin_overrides),
    true,
  );
  TestValidator.equals(
    "refund request type is refund",
    adminRefund.request_type,
    "refund",
  );
}
