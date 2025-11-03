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
 * Test that a refund status history entry cannot be accessed by a customer who
 * is not the owner of the refund.
 *
 * 1. Register a seller.
 * 2. Seller creates a product.
 * 3. Seller creates an SKU for the product.
 * 4. Register Customer A (the refund owner).
 * 5. Customer A places an order for the SKU.
 * 6. Customer A creates a refund request for the order line.
 * 7. Extract the refund status history id.
 * 8. Register Customer B (unrelated user).
 * 9. Attempt to read the refund status history entry as Customer B and verify
 *    access is denied (forbidden or not found).
 */
export async function test_api_refund_status_history_permission_denied_for_unrelated_user(
  connection: api.IConnection,
) {
  // Register seller
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

  // Seller creates product
  const productCode = RandomGenerator.alphaNumeric(10);
  const product = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: {
        code: productCode,
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
        main_image_uri: "https://cdn.example.com/product_main.jpg",
        status: "active",
        business_status: "approved",
      } satisfies IShoppingProduct.ICreate,
    },
  );
  typia.assert(product);

  // Seller creates SKU
  const sku = await api.functional.shopping.seller.products.skus.create(
    connection,
    {
      productCode: product.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        price: 10000,
        is_active: true,
        barcode: "1234567890123",
        status: "in_stock",
        variant_attribute_value_ids: [
          typia.random<string & tags.Format<"uuid">>(),
        ],
      } satisfies IShoppingSku.ICreate,
    },
  );
  typia.assert(sku);

  // Register Customer A
  const customerAEmail = typia.random<string & tags.Format<"email">>();
  const customerA = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerAEmail,
      password: RandomGenerator.alphaNumeric(12) as string &
        tags.MinLength<8> &
        tags.MaxLength<128>,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://shop.example.com/register",
      referrer: "https://shop.example.com/landing",
    } satisfies IShoppingCustomer.ICreate,
  });
  typia.assert(customerA);

  // Customer A places order
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
          } satisfies IShoppingOrderLine.ICreate,
        ],
        shipping_addresses: [
          {
            type: "shipping",
            recipient_name: RandomGenerator.name(),
            recipient_phone: RandomGenerator.mobile(),
            zip_code: RandomGenerator.alphaNumeric(5),
            base_address: RandomGenerator.paragraph({
              sentences: 1,
              wordMin: 5,
              wordMax: 10,
            }),
            city: "Seoul",
            state_province: "Seoul",
            country: "KOR",
          } satisfies IShoppingOrderAddress.ICreate,
        ],
        payment_method: "manual",
      } satisfies IShoppingOrder.ICreate,
    },
  );
  typia.assert(order);

  // Customer A creates refund request
  const refund = await api.functional.shopping.customer.refunds.create(
    connection,
    {
      body: {
        shopping_order_id: order.id,
        request_type: "refund",
        business_reason: "Wrong item received",
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
  typia.assert(refund);
  const statusHistoryId = refund.status_histories[0]?.id;
  typia.assert(statusHistoryId);

  // Register unrelated Customer B
  const customerBEmail = typia.random<string & tags.Format<"email">>();
  const customerB = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerBEmail,
      password: RandomGenerator.alphaNumeric(12) as string &
        tags.MinLength<8> &
        tags.MaxLength<128>,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://shop.example.com/register",
      referrer: "https://shop.example.com/landing",
    } satisfies IShoppingCustomer.ICreate,
  });
  typia.assert(customerB);

  // Attempt to access refund status history as Customer B
  await TestValidator.error(
    "unrelated customer cannot access refund status history entry",
    async () => {
      await api.functional.shopping.customer.refunds.statuses.at(connection, {
        refundRequestId: refund.id,
        statusHistoryId,
      });
    },
  );
}
