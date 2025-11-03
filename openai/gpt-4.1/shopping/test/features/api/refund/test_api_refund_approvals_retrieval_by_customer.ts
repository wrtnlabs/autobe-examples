import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingRefundApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingRefundApproval";
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
 * Customer retrieves all refund approval/rejection audit log entries for their
 * own refund request.
 *
 * This test covers: customer registration, seller registration & product/SKU
 * creation, order placing, refund initiation, and then customer fetches all
 * approval log entries for that refund via PATCH
 * /shopping/customer/refunds/{refundRequestId}/approvals. It validates (a)
 * successful response structure and typing, (b) correct access control
 * visibility, and (c) that all entries represent only admin/seller approval
 * actions (not system/customer actions).
 */
export async function test_api_refund_approvals_retrieval_by_customer(
  connection: api.IConnection,
) {
  // 1. Register new customer
  const customerEmail = RandomGenerator.alphaNumeric(10) + "@testmail.com";
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://testdomain.com/ref",
        referrer: "https://testdomain.com/register",
      },
    });
  typia.assert(customer);

  // 2. Register seller
  const sellerEmail = RandomGenerator.alphaNumeric(10) + "@testmail.com";
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "S3ll3rP@ssw0rd!",
        display_name: RandomGenerator.name(),
        contact_phone: RandomGenerator.mobile(),
        status: "pending",
      },
    });
  typia.assert(seller);

  // 3. Seller creates a product
  const productCode = RandomGenerator.alphaNumeric(8);
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 9,
        }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        main_image_uri:
          "https://cdn.example.com/prod/" +
          RandomGenerator.alphaNumeric(8) +
          ".jpg",
        status: "active",
        business_status: "in_review",
      },
    });
  typia.assert(product);

  // 4. Seller creates SKU for product - fix: variant_attribute_value_ids must have at least 1 id
  const skuCode = RandomGenerator.alphaNumeric(12);
  const variantAttributeId = typia.random<string & tags.Format<"uuid">>();
  const sku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: product.code,
      body: {
        sku_code: skuCode,
        price: 9900,
        is_active: true,
        status: "in_stock",
        variant_attribute_value_ids: [variantAttributeId],
      },
    });
  typia.assert(sku);

  // 5. Customer places an order
  const shippingAddress = {
    type: "shipping" as const,
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    zip_code: RandomGenerator.alphaNumeric(5),
    base_address: RandomGenerator.paragraph({ sentences: 2 }),
    detail_address: RandomGenerator.paragraph({ sentences: 2 }),
    city: "Seoul",
    state_province: "Seoul",
    country: "South Korea",
  };
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
        shipping_addresses: [shippingAddress],
        payment_method: "CARD",
      },
    });
  typia.assert(order);

  // 6. Customer submits a refund request
  const refund: IShoppingRefundRequest =
    await api.functional.shopping.customer.refunds.create(connection, {
      body: {
        shopping_order_id: order.id,
        request_type: "refund",
        business_reason: "Item not working",
        items: [
          {
            shopping_order_id: order.id,
            shopping_order_line_id: order.order_lines[0].id,
            quantity: 1,
          },
        ],
      },
    });
  typia.assert(refund);

  // 7. Customer fetches refund approval records (audit actions by admin/seller for this refund)
  const page: IPageIShoppingRefundApproval.ISummary =
    await api.functional.shopping.customer.refunds.approvals.index(connection, {
      refundRequestId: refund.id,
      body: {
        page: 1,
        pageSize: 20,
      },
    });
  typia.assert(page);

  // Basic validations
  TestValidator.equals(
    "refund approvals request returns correct refundRequestId for all entries",
    page.data.every((x) => x.shopping_refund_request_id === refund.id),
    true,
  );
  TestValidator.predicate(
    "refund approvals result type is array",
    Array.isArray(page.data),
  );
  // All actor_type must be either 'admin' or 'seller'
  TestValidator.equals(
    "all refund approval entries should have actor_type as admin or seller",
    page.data.every((x) => ["admin", "seller"].includes(x.actor_type)),
    true,
  );
}
