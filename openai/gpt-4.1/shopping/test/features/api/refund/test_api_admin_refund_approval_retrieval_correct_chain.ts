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
 * Verify that an admin can retrieve the details of a specific approval action
 * associated with a refund request, including all required business fields for
 * audit and compliance.
 *
 * Steps:
 *
 * 1. Register an admin (with privilege and status).
 * 2. Register a seller (with product and SKU setup).
 * 3. Register a customer.
 * 4. Customer places an order for the SKU.
 * 5. Customer requests a refund for the order.
 * 6. (Simulated) Approval by admin (since no approval POST API is available, we
 *    reuse refund request with auto-generated approval for test).
 * 7. Admin retrieves approval detail with GET
 *    /shopping/admin/refunds/{refundRequestId}/approvals/{approvalId}.
 * 8. Validate all critical approval fields: actor, action type/status, rationale,
 *    audit timestamps.
 * 9. Assert approval returned matches approval on parent refund request and is
 *    complete for audit.
 */
export async function test_api_admin_refund_approval_retrieval_correct_chain(
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
        role: "support",
        status: "active",
      },
    });
  typia.assert(admin);

  // 2. Register seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(10);
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        display_name: RandomGenerator.name(2),
        contact_phone: RandomGenerator.mobile(),
        status: "active",
      },
    });
  typia.assert(seller);

  // 3. Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(10);
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://test.customer.local/registration",
        referrer: "https://test.customer.local/welcome",
      },
    });
  typia.assert(customer);

  // 4. Seller creates a product
  const productCode = RandomGenerator.alphaNumeric(8);
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 8,
          sentenceMax: 12,
        }),
        main_image_uri:
          "https://cdn.test.mall/img/" +
          RandomGenerator.alphaNumeric(12) +
          ".jpg",
        status: "active",
        business_status: "in_review",
      },
    });
  typia.assert(product);

  // 5. Seller creates a SKU under the product
  const attributeValueId = typia.random<string & tags.Format<"uuid">>();
  const skuCode = RandomGenerator.alphaNumeric(8);
  const sku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: product.code,
      body: {
        sku_code: skuCode,
        price: 19900,
        is_active: true,
        status: "in_stock",
        variant_attribute_value_ids: [attributeValueId],
      },
    });
  typia.assert(sku);

  // 6. Customer places an order for the SKU
  const order: IShoppingOrder =
    await api.functional.shopping.customer.orders.create(connection, {
      body: {
        total_price: sku.price,
        order_lines: [
          {
            shopping_sku_id: sku.id,
            quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            unit_price: sku.price,
          },
        ],
        shipping_addresses: [
          {
            type: "shipping",
            recipient_name: RandomGenerator.name(2),
            recipient_phone: RandomGenerator.mobile(),
            zip_code: RandomGenerator.alphaNumeric(5),
            base_address: RandomGenerator.paragraph({
              sentences: 2,
              wordMin: 2,
              wordMax: 5,
            }),
            city: "Seoul",
            state_province: "Seoul",
            country: "Korea",
          },
        ],
        payment_method: "virtual_account",
      },
    });
  typia.assert(order);

  // 7. Customer requests a refund for the order
  const refundRequest: IShoppingRefundRequest =
    await api.functional.shopping.customer.refunds.create(connection, {
      body: {
        shopping_order_id: order.id,
        request_type: "refund",
        business_reason: "Change of mind",
        items: [
          {
            shopping_order_id: order.id,
            shopping_order_line_id: order.order_lines[0].id,
            quantity: 1 as number & tags.Type<"int32">,
          },
        ],
      },
    });
  typia.assert(refundRequest);

  // 8. Find at least one approval generated on refundRequest for verification
  TestValidator.predicate(
    "refund request has at least one approval",
    refundRequest.approvals.length > 0,
  );
  const approval = refundRequest.approvals[0];
  typia.assert(approval);

  // 9. Admin retrieves approval details by GET endpoint
  const approvalDetail: IShoppingRefundApproval =
    await api.functional.shopping.admin.refunds.approvals.at(connection, {
      refundRequestId: refundRequest.id,
      approvalId: approval.id,
    });
  typia.assert(approvalDetail);

  // 10. Validate critical approval fields
  TestValidator.equals("approval id matches", approvalDetail.id, approval.id);
  TestValidator.equals(
    "approval action matches",
    approvalDetail.action,
    approval.action,
  );
  TestValidator.equals(
    "approval actor matches",
    approvalDetail.actor_id,
    approval.actor_id,
  );
  TestValidator.equals(
    "approval note matches",
    approvalDetail.note,
    approval.note,
  );
  TestValidator.equals(
    "approval created_at matches",
    approvalDetail.created_at,
    approval.created_at,
  );

  // 11. Validation: approval must link to the correct refundRequestId
  TestValidator.equals(
    "approval requestId matches",
    approvalDetail.shopping_refund_request_id,
    refundRequest.id,
  );

  // 12. Validate action value is one of the allowed business values
  TestValidator.predicate(
    "approval action is one of 'approved' or 'rejected'",
    approvalDetail.action === "approved" ||
      approvalDetail.action === "rejected",
  );
}
