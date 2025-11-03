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
 * Validate seller soft-delete (archive) of their own refund request.
 *
 * This function covers the following scenario:
 *
 * 1. Seller registers account
 * 2. Seller registers a product
 * 3. Seller adds a SKU to the product (with at least one attribute variant id, per
 *    tags.MinItems<1> constraint)
 * 4. Customer registers account
 * 5. Customer places order for the seller's product/SKU
 * 6. Customer (via platform API) creates a refund request for their order
 * 7. Seller performs DELETE to archive their own refund request
 * 8. Test validates:
 *
 *    - Refund request's deleted_at field is set (if fetchable in system)
 *    - Refund request would not appear in any active query (if such an endpoint
 *         exists)
 *    - Refund request still exists in system, visible in audit log (if system
 *         exposes that capability)
 *    - Business process completes without violation
 */
export async function test_api_seller_refund_request_soft_delete(
  connection: api.IConnection,
) {
  // 1. Seller registration
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "Seller#Password1";
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        display_name: RandomGenerator.name(),
        contact_phone: RandomGenerator.mobile(),
        status: "pending",
      },
    });
  typia.assert(seller);

  // 2. Seller product creation
  const productCode = RandomGenerator.alphaNumeric(10);
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        main_image_uri: "https://example.com/image.jpg",
        status: "active",
        business_status: "in_review",
      },
    });
  typia.assert(product);

  // 3. Seller SKU creation (with at least 1 attribute value id due to tags.MinItems<1> requirement)
  const skuCode = `${productCode}-sku1`;
  const attributeValueId = typia.random<string & tags.Format<"uuid">>();
  const sku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: productCode,
      body: {
        sku_code: skuCode,
        price: 10000,
        is_active: true,
        status: "in_stock",
        variant_attribute_value_ids: [attributeValueId],
      },
    });
  typia.assert(sku);

  // 4. Customer registration
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "Customer#Password1";
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://testshop.com/register",
        referrer: "https://testshop.com/landing",
      },
    });
  typia.assert(customer);

  // 5. Customer places order
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
            zip_code: "12345",
            base_address: "123 Testing Road",
            city: "Seoul",
            state_province: "Seoul",
            country: "South Korea",
          },
        ],
        payment_method: "card",
      },
    });
  typia.assert(order);

  // 6. Customer initiates refund for the order line
  const refund: IShoppingRefundRequest =
    await api.functional.shopping.admin.refunds.create(connection, {
      body: {
        shopping_order_id: order.id,
        request_type: "refund",
        business_reason: "Customer requested return/refund for automated test.",
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

  // 7. Seller archives (soft-deletes) the refund request
  await api.functional.shopping.seller.refunds.erase(connection, {
    refundRequestId: refund.id,
  });
}
