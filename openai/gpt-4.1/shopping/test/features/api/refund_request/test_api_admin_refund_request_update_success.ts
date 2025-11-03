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

export async function test_api_admin_refund_request_update_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: RandomGenerator.pick([
      "super",
      "support",
      "compliance",
      "operator",
    ] as const),
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(admin);

  // 2. Create product as seller (simulate, no seller login, as admin has permission)
  const productInput = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    main_image_uri: "https://example.com/image.png",
    status: "active",
    business_status: "approved",
  } satisfies IShoppingProduct.ICreate;
  const product = await api.functional.shopping.seller.products.create(
    connection,
    { body: productInput },
  );
  typia.assert(product);

  // 3. Create SKU for the product
  const skuInput = {
    sku_code: RandomGenerator.alphaNumeric(8),
    price: 25000,
    is_active: true,
    status: "in_stock",
    variant_attribute_value_ids: [],
  } satisfies IShoppingSku.ICreate;
  const sku = await api.functional.shopping.seller.products.skus.create(
    connection,
    {
      productCode: product.code,
      body: skuInput,
    },
  );
  typia.assert(sku);

  // 4. Create an order as a customer (no customer actor required for test)
  const addressInput = {
    type: "shipping",
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    zip_code: RandomGenerator.alphaNumeric(5),
    base_address: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    country: "CountryLand",
  } satisfies IShoppingOrderAddress.ICreate;
  const orderInput = {
    total_price: sku.price,
    order_lines: [
      {
        shopping_sku_id: sku.id,
        quantity: 1,
        unit_price: sku.price,
      },
    ],
    shipping_addresses: [addressInput],
    payment_method: "credit_card",
  } satisfies IShoppingOrder.ICreate;
  const order = await api.functional.shopping.customer.orders.create(
    connection,
    { body: orderInput },
  );
  typia.assert(order);

  // 5. Create refund request as admin
  const refundRequestInput = {
    shopping_order_id: order.id,
    request_type: "refund",
    business_reason: "Initial reason: duplicate order",
    items: [
      {
        shopping_order_id: order.id,
        shopping_order_line_id: order.order_lines[0].id,
        quantity: 1,
      },
    ],
  } satisfies IShoppingRefundRequest.ICreate;
  const refundRequest = await api.functional.shopping.admin.refunds.create(
    connection,
    { body: refundRequestInput },
  );
  typia.assert(refundRequest);

  // 6. Update the refund request business_reason and add request_context
  const updatedBusinessReason = "Updated reason: customer changed mind";
  const updatedRequestContext =
    "Customer called support and clarified reason over phone.";
  const updated = await api.functional.shopping.admin.refunds.update(
    connection,
    {
      refundRequestId: refundRequest.id,
      body: {
        business_reason: updatedBusinessReason,
        request_context: updatedRequestContext,
      },
    },
  );
  typia.assert(updated);

  // 7. Validate that updates are reflected
  TestValidator.equals(
    "business_reason is updated",
    updated.business_reason,
    updatedBusinessReason,
  );
  TestValidator.equals(
    "request_context is updated",
    updated.request_context,
    updatedRequestContext,
  );
  // Ensure audit trail contains an entry for this update (status_histories not empty & updated_at changes)
  TestValidator.predicate(
    "status_histories contains at least one entry",
    Array.isArray(updated.status_histories) &&
      updated.status_histories.length > 0,
  );
  // Bonus: updated_at timestamp is after created_at
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updated.updated_at).getTime() >=
      new Date(updated.created_at).getTime(),
  );
}
