import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingRefundRequest";
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

export async function test_api_admin_refund_search_workflow(
  connection: api.IConnection,
) {
  // 1. Register an admin
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    role: "super", // simple privilege
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(admin);

  // 2. Register a seller
  const sellerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerJoinInput,
  });
  typia.assert(seller);

  // 3. Seller creates a product
  const productCode = RandomGenerator.alphaNumeric(13);
  const productCreateInput = {
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    main_image_uri:
      "https://cdn.example.com/" + RandomGenerator.alphaNumeric(12) + ".jpg",
    status: "active",
    business_status: "approved",
  } satisfies IShoppingProduct.ICreate;
  const product = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: productCreateInput,
    },
  );
  typia.assert(product);

  // 4. Seller creates a SKU (at least one)
  // For the variant_attribute_value_ids: for minimal, pass [typia.random<string>()]
  const skuCode = RandomGenerator.alphaNumeric(8);
  const skuCreateInput = {
    sku_code: skuCode,
    price: 19900,
    is_active: true,
    barcode: null,
    status: "in_stock",
    variant_attribute_value_ids: [typia.random<string>()],
  } satisfies IShoppingSku.ICreate;
  const sku = await api.functional.shopping.seller.products.skus.create(
    connection,
    {
      productCode: productCode,
      body: skuCreateInput,
    },
  );
  typia.assert(sku);

  // 5. Register a customer
  const customerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(14),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://client.app/onboarding", // fake
    referrer: "https://client.app/landing", // fake
    ip: null,
  } satisfies IShoppingCustomer.ICreate;
  const customer = await api.functional.auth.customer.join(connection, {
    body: customerJoinInput,
  });
  typia.assert(customer);

  // 6. Customer creates an order (purchasing one SKU)
  const orderLine = {
    shopping_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    unit_price: sku.price,
  } satisfies IShoppingOrderLine.ICreate;
  const shippingAddress = {
    type: "shipping",
    recipient_name: customer.name,
    recipient_phone: customer.phone,
    zip_code: "06236",
    base_address: "100 Test Road",
    detail_address: "12F Test Tower",
    city: "Seoul",
    state_province: "Seoul",
    country: "Korea",
  } satisfies IShoppingOrderAddress.ICreate;
  const orderInput = {
    total_price: sku.price,
    order_lines: [orderLine],
    shipping_addresses: [shippingAddress],
    payment_method: "card",
    coupon_code: null,
  } satisfies IShoppingOrder.ICreate;
  const order = await api.functional.shopping.customer.orders.create(
    connection,
    {
      body: orderInput,
    },
  );
  typia.assert(order);

  // 7. Customer or admin files a refund request for that order
  const refundCreateInput = {
    shopping_order_id: order.id,
    request_type: "refund",
    business_reason: "buyer remorse",
    request_context: "customer changed mind to test refund workflow",
    items: [
      {
        shopping_order_id: order.id,
        shopping_order_line_id: order.order_lines[0].id,
        quantity: 1 as number & tags.Type<"int32">,
        item_business_reason: "Full refund requested by customer",
        attachments: [],
      },
    ],
    attachments: [],
  } satisfies IShoppingRefundRequest.ICreate;
  const refund = await api.functional.shopping.admin.refunds.create(
    connection,
    {
      body: refundCreateInput,
    },
  );
  typia.assert(refund);

  // 8. Admin searches refunds with no filters (should see refund)
  const pageOutput = await api.functional.shopping.admin.refunds.index(
    connection,
    {
      body: { page: 1, limit: 10 },
    },
  );
  typia.assert(pageOutput);
  TestValidator.predicate(
    "admin can see refund request in result data",
    pageOutput.data.some((r) => r.id === refund.id),
  );

  // 9. Admin searches with filter by request_type = refund
  const filteredPage = await api.functional.shopping.admin.refunds.index(
    connection,
    {
      body: { request_type: "refund", page: 1, limit: 5 },
    },
  );
  typia.assert(filteredPage);
  TestValidator.predicate(
    "admin refund search by type returns correct id",
    filteredPage.data.some((r) => r.id === refund.id),
  );

  // 10. Pagination - check that our refund appears in the right page
  const notFoundPage = await api.functional.shopping.admin.refunds.index(
    connection,
    {
      body: { page: 999, limit: 1 },
    },
  );
  typia.assert(notFoundPage);
  TestValidator.equals(
    "empty result in high page",
    notFoundPage.data.length,
    0,
  );
}
