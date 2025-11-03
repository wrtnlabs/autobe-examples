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

export async function test_api_admin_refund_request_creation_with_auth_and_order_prereqs(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(2),
        role: "super", // Must match allowed role string
        status: "active", // Must match allowed status string
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Seller registration
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(2),
        contact_phone: RandomGenerator.mobile(),
        status: "pending", // Value on registration must be pending
      } satisfies IShoppingSeller.IJoin,
    });
  typia.assert(seller);

  // 3. Product creation by seller
  const productCode = RandomGenerator.alphaNumeric(8);
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        main_image_uri: "https://picsum.photos/200/300", // Simulate a valid image URI
        status: "draft",
        business_status: "in_review",
      } satisfies IShoppingProduct.ICreate,
    });
  typia.assert(product);

  // 4. SKU creation for product
  const attributeId = typia.random<string & tags.Format<"uuid">>();
  const skuCode = RandomGenerator.alphaNumeric(10);
  const sku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: product.code,
      body: {
        sku_code: skuCode,
        price: 10000,
        is_active: true,
        barcode: null,
        status: "in_stock",
        variant_attribute_value_ids: [attributeId], // Must be at least one (required)
      } satisfies IShoppingSku.ICreate,
    });
  typia.assert(sku);

  // 5. Customer registration
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
        href: "https://shopper.com/checkout", // Simulated
        referrer: "https://shopper.com/landing", // Simulated
        ip: null,
      } satisfies IShoppingCustomer.ICreate,
    });
  typia.assert(customer);

  // 6. Order creation (customer)
  const shippingAddress: IShoppingOrderAddress.ICreate = {
    type: "shipping",
    recipient_name: customer.name,
    recipient_phone: customer.phone,
    zip_code: RandomGenerator.alphaNumeric(5),
    base_address: RandomGenerator.paragraph({ sentences: 2 }),
    detail_address: "Suite 101",
    city: "Seoul",
    state_province: "Seoul",
    country: "South Korea",
  } satisfies IShoppingOrderAddress.ICreate;

  // Construct order line
  const orderLine: IShoppingOrderLine.ICreate = {
    shopping_sku_id: sku.id,
    quantity: 1,
    unit_price: sku.price,
  } satisfies IShoppingOrderLine.ICreate;

  const order: IShoppingOrder =
    await api.functional.shopping.customer.orders.create(connection, {
      body: {
        total_price: sku.price,
        order_lines: [orderLine],
        shipping_addresses: [shippingAddress],
        payment_method: "card",
        coupon_code: null,
      } satisfies IShoppingOrder.ICreate,
    });
  typia.assert(order);
  TestValidator.equals(
    "order contains line with SKU id",
    order.order_lines[0].sku.id,
    sku.id,
  );

  // 7. Admin creates refund request
  const refundReqBody = {
    shopping_order_id: order.id,
    request_type: RandomGenerator.pick([
      "refund",
      "return",
      "cancellation",
    ] as const),
    business_reason: RandomGenerator.paragraph({ sentences: 2 }),
    items: [
      {
        shopping_order_id: order.id,
        shopping_order_line_id: order.order_lines[0].id,
        quantity: order.order_lines[0].quantity,
        item_business_reason: null,
        attachments: undefined,
      } satisfies IShoppingRefundRequestItem.ICreate,
    ],
    attachments: undefined,
  } satisfies IShoppingRefundRequest.ICreate;

  const refundReq: IShoppingRefundRequest =
    await api.functional.shopping.admin.refunds.create(connection, {
      body: refundReqBody,
    });
  typia.assert(refundReq);

  TestValidator.equals(
    "refund request is for correct order and line",
    refundReq.order.id,
    order.id,
  );
  TestValidator.equals(
    "refund actor is admin",
    refundReq.actor.actor_type,
    "admin",
  );
  TestValidator.equals(
    "refund item quantity matches order line",
    refundReq.items[0].quantity,
    order.order_lines[0].quantity,
  );

  // Try to duplicate refund request on the same order/line: should fail
  await TestValidator.error("duplicate refund request fails", async () => {
    await api.functional.shopping.admin.refunds.create(connection, {
      body: refundReqBody,
    });
  });

  // Try refund as unauthenticated connection: should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated admin cannot create refund",
    async () => {
      await api.functional.shopping.admin.refunds.create(unauthConn, {
        body: refundReqBody,
      });
    },
  );
}
