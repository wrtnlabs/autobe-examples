import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingRefundAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingRefundAttachment";
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
 * Validate that an admin can list attachments for a refund request with full
 * prerequisites.
 *
 * This test validates the workflow in which an admin user authenticates,
 * ensures a full cascade of dependencies (seller, product, sku, customer,
 * order, refund) are created, and then lists all refund attachments for the
 * refund request using admin APIs. Pagination and type filtering are exercised,
 * with results validated as correct summaries matching expectations. Steps:
 *
 * 1. Register admin user
 * 2. Register seller
 * 3. Seller creates product
 * 4. Seller creates SKU under product
 * 5. Register customer
 * 6. Customer creates order for SKU
 * 7. Customer creates refund request for that order
 * 8. Admin lists refund attachments using
 *    /shopping/admin/refunds/{refundRequestId}/attachments
 * 9. Validate correct results (pagination, attachment summary correctness)
 */
export async function test_api_refund_attachments_list_admin_workflow(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        role: "super",
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Register seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.paragraph({ sentences: 2 }),
        contact_phone: RandomGenerator.mobile(),
        status: "pending",
      } satisfies IShoppingSeller.IJoin,
    });
  typia.assert(seller);

  // 3. Seller creates product
  const productCode = RandomGenerator.alphaNumeric(12);
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        main_image_uri: "https://cdn.example.com/image.png",
        status: "active",
        business_status: "approved",
        shipping_weight_grams: 400,
        shipping_length_cm: 18,
        shipping_width_cm: 8,
        shipping_height_cm: 7,
        shipping_options: "standard",
      } satisfies IShoppingProduct.ICreate,
    });
  typia.assert(product);

  // 4. Seller creates SKU
  const skuCode = RandomGenerator.alphaNumeric(12);
  const sku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: product.code,
      body: {
        sku_code: skuCode,
        price: 9900,
        is_active: true,
        barcode: null,
        status: "in_stock",
        variant_attribute_value_ids: [] satisfies string[] as string[],
      } satisfies IShoppingSku.ICreate,
    });
  typia.assert(sku);

  // 5. Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://www.test-client.com/join",
        referrer: "https://www.test-client.com/",
        ip: null,
      } satisfies IShoppingCustomer.ICreate,
    });
  typia.assert(customer);

  // 6. Customer creates order
  const order: IShoppingOrder =
    await api.functional.shopping.customer.orders.create(connection, {
      body: {
        total_price: sku.price,
        order_lines: [
          {
            shopping_sku_id: sku.id,
            quantity: 1,
            unit_price: sku.price,
          } satisfies IShoppingOrderLine.ICreate,
        ],
        shipping_addresses: [
          {
            type: "shipping",
            recipient_name: RandomGenerator.name(),
            recipient_phone: RandomGenerator.mobile(),
            zip_code: "12345",
            base_address: "123 Test St",
            detail_address: null,
            city: "Seoul",
            state_province: "Seoul",
            country: "Korea",
          } satisfies IShoppingOrderAddress.ICreate,
        ],
        payment_method: "card",
        coupon_code: null,
      } satisfies IShoppingOrder.ICreate,
    });
  typia.assert(order);

  // 7. Customer creates refund request
  const refundRequest: IShoppingRefundRequest =
    await api.functional.shopping.customer.refunds.create(connection, {
      body: {
        shopping_order_id: order.id,
        request_type: "refund",
        business_reason: "test_item_faulty",
        request_context: null,
        items: [
          {
            shopping_order_id: order.id,
            shopping_order_line_id: order.order_lines[0].id,
            quantity: 1,
            item_business_reason: null,
            attachments: undefined,
          } satisfies IShoppingRefundRequestItem.ICreate,
        ],
        attachments: undefined,
      } satisfies IShoppingRefundRequest.ICreate,
    });
  typia.assert(refundRequest);

  // 8. List refund attachments as admin
  const queryBody = {
    page: 1,
    limit: 20,
    attachment_type: undefined,
    uploaded_after: undefined,
    uploaded_before: undefined,
    keyword: undefined,
  } satisfies IShoppingRefundAttachment.IRequest;
  const result: IPageIShoppingRefundAttachment.ISummary =
    await api.functional.shopping.admin.refunds.attachments.index(connection, {
      refundRequestId: refundRequest.id,
      body: queryBody,
    });
  typia.assert(result);

  // 9. Validate results
  TestValidator.equals(
    "refundRequestId in all attachments should match queried request",
    true,
    result.data.every(
      (att) => att.shopping_refund_request_id === refundRequest.id,
    ),
  );
  TestValidator.predicate(
    "pagination page is 1",
    result.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 20",
    result.pagination.limit === 20,
  );
}
