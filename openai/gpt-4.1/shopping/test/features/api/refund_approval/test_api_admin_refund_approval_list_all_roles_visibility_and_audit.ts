import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingRefundApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingRefundApproval";
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

export async function test_api_admin_refund_approval_list_all_roles_visibility_and_audit(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      role: "super-admin",
      status: "active",
    } satisfies IShoppingAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Register seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    } satisfies IShoppingSeller.IJoin,
  });
  typia.assert(seller);

  // 3. Seller creates product
  const productCode = RandomGenerator.alphaNumeric(10);
  const product = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        main_image_uri:
          "https://cdn.test.com/" + RandomGenerator.alphaNumeric(10) + ".jpg",
        status: "active",
        business_status: "approved",
      } satisfies IShoppingProduct.ICreate,
    },
  );
  typia.assert(product);

  // 4. Seller creates SKU for product
  const skuVariantId = typia.random<string & tags.Format<"uuid">>();
  const sku = await api.functional.shopping.seller.products.skus.create(
    connection,
    {
      productCode: product.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(12),
        price: 25000,
        is_active: true,
        status: "in_stock",
        variant_attribute_value_ids: [skuVariantId],
      } satisfies IShoppingSku.ICreate,
    },
  );
  typia.assert(sku);

  // 5. Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://testmall.com/join",
      referrer: "https://testmall.com/landing",
    } satisfies IShoppingCustomer.ICreate,
  });
  typia.assert(customer);

  // 6. Customer places order
  const order = await api.functional.shopping.customer.orders.create(
    connection,
    {
      body: {
        total_price: 25000,
        order_lines: [
          {
            shopping_sku_id: sku.id,
            quantity: 1,
            unit_price: 25000,
          } satisfies IShoppingOrderLine.ICreate,
        ],
        shipping_addresses: [
          {
            type: "shipping",
            recipient_name: customer.name,
            recipient_phone: customer.phone,
            zip_code: "12345",
            base_address: "123 Refund Test Rd.",
            city: "Seoul",
            state_province: "Seoul Special City",
            country: "Korea",
          } satisfies IShoppingOrderAddress.ICreate,
        ],
        payment_method: "virtual_account",
      } satisfies IShoppingOrder.ICreate,
    },
  );
  typia.assert(order);

  // 7. Seller requests refund (on behalf of customer)
  const refundRequest = await api.functional.shopping.seller.refunds.create(
    connection,
    {
      body: {
        shopping_order_id: order.id,
        request_type: "refund",
        business_reason: "item defective",
        items: [
          {
            shopping_order_id: order.id,
            shopping_order_line_id: order.order_lines[0].id,
            quantity: 1,
          } satisfies IShoppingRefundRequestItem.ICreate,
        ],
      } satisfies IShoppingRefundRequest.ICreate,
    },
  );
  typia.assert(refundRequest);

  // 8. Emulate approval/rejection actions (simulate via direct status history/approval population)
  // NOTE: Since only the fetch API for approval listing (& not approval creation API) is documented,
  // we assume that the refundRequest already is in a state with multiple approvals for this scenario.
  // This scenario thus focuses on auditing the listing and filtering.

  // 9. Admin fetches paginated approval/rejection records
  const page1 = await api.functional.shopping.admin.refunds.approvals.index(
    connection,
    {
      refundRequestId: refundRequest.id,
      body: {
        page: 1,
        pageSize: 10,
      },
    },
  );
  typia.assert(page1);

  TestValidator.predicate(
    "should have at least one approval record (admin or seller)",
    page1.data.length > 0,
  );

  // 10. Check that all approvals are for the correct refund request id
  for (const approval of page1.data) {
    TestValidator.equals(
      "approval is for requested refund",
      approval.shopping_refund_request_id,
      refundRequest.id,
    );
  }

  // 11. Optionally, check filtering - e.g., only admin approvals
  const adminFiltered =
    await api.functional.shopping.admin.refunds.approvals.index(connection, {
      refundRequestId: refundRequest.id,
      body: {
        page: 1,
        pageSize: 10,
        actor_type: "admin",
      },
    });
  typia.assert(adminFiltered);
  for (const approval of adminFiltered.data) {
    TestValidator.equals(
      "approval actor_type is admin",
      approval.actor_type,
      "admin",
    );
  }

  // 12. Optionally, check filtering - only seller approvals
  const sellerFiltered =
    await api.functional.shopping.admin.refunds.approvals.index(connection, {
      refundRequestId: refundRequest.id,
      body: {
        page: 1,
        pageSize: 10,
        actor_type: "seller",
      },
    });
  typia.assert(sellerFiltered);
  for (const approval of sellerFiltered.data) {
    TestValidator.equals(
      "approval actor_type is seller",
      approval.actor_type,
      "seller",
    );
  }

  // 13. Optionally, check has_note filter logic (if at least one approval has a note)
  const withNote = await api.functional.shopping.admin.refunds.approvals.index(
    connection,
    {
      refundRequestId: refundRequest.id,
      body: {
        page: 1,
        pageSize: 10,
        has_note: true,
      },
    },
  );
  typia.assert(withNote);
  for (const approval of withNote.data) {
    TestValidator.predicate(
      "approval has non-empty note when filtered by has_note",
      approval.note !== undefined &&
        approval.note !== null &&
        approval.note.length > 0,
    );
  }
}
