import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingRefundStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingRefundStatusHistory";
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

export async function test_api_seller_refund_status_history_retrieval_by_seller(
  connection: api.IConnection,
) {
  // 1. Register a seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoin = {
    email: sellerEmail,
    password: "testpass-1234",
    display_name: RandomGenerator.name(2),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoin });
  typia.assert(seller);

  // 2. Create a product
  const productCode = RandomGenerator.alphaNumeric(10);
  const productCreateBody = {
    code: productCode,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 10 }),
    main_image_uri: `https://dummyimg.com/600x400/000/fff&text=${productCode}`,
    status: "active",
    business_status: "approved",
    shipping_weight_grams: 2500,
    shipping_length_cm: 50,
    shipping_width_cm: 30,
    shipping_height_cm: 10,
    shipping_options: "Standard Domestic Courier",
  } satisfies IShoppingProduct.ICreate;
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 3. Register a SKU using first attribute value if exists else []
  const skuCode = RandomGenerator.alphaNumeric(12);
  const variantAttrs = product.attributes.length
    ? [product.attributes[0].attribute_value.id]
    : [RandomGenerator.alphaNumeric(8)]; // fallback to random string
  const skuCreateBody = {
    sku_code: skuCode,
    price: 23400,
    is_active: true,
    barcode: RandomGenerator.alphaNumeric(10),
    status: "in_stock",
    variant_attribute_value_ids: variantAttrs,
  } satisfies IShoppingSku.ICreate;
  const sku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: productCode,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 4. Customer places an order for the SKU
  // Customer context: simulate as a new connection to clear seller auth
  const customerConnection: api.IConnection = { ...connection, headers: {} };
  const shippingAddress: IShoppingOrderAddress.ICreate = {
    type: "shipping",
    recipient_name: RandomGenerator.name(2),
    recipient_phone: RandomGenerator.mobile(),
    zip_code: "05033",
    base_address: "123 Test Street",
    city: "Test City",
    state_province: "Test State",
    country: "Korea",
  };
  const orderBody = {
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
  } satisfies IShoppingOrder.ICreate;
  const order: IShoppingOrder =
    await api.functional.shopping.customer.orders.create(customerConnection, {
      body: orderBody,
    });
  typia.assert(order);

  // 5. Customer creates a refund request for the order
  const refundItemBody = {
    shopping_order_id: order.id,
    shopping_order_line_id: order.order_lines[0].id,
    quantity: 1,
  } satisfies IShoppingRefundRequestItem.ICreate;
  const refundReqBody = {
    shopping_order_id: order.id,
    request_type: "refund",
    business_reason: "faultyItem",
    items: [refundItemBody],
  } satisfies IShoppingRefundRequest.ICreate;
  const refund: IShoppingRefundRequest =
    await api.functional.shopping.customer.refunds.create(customerConnection, {
      body: refundReqBody,
    });
  typia.assert(refund);

  // 6. Seller retrieves refund status history
  // Use default pagination, no filter
  const statusReqBody = {
    page: 1,
    limit: 10,
  } satisfies IShoppingRefundStatusHistory.IRequest;
  const page: IPageIShoppingRefundStatusHistory =
    await api.functional.shopping.seller.refunds.statuses.index(connection, {
      refundRequestId: refund.id,
      body: statusReqBody,
    });
  typia.assert(page);

  TestValidator.predicate(
    "refund status history entries exist",
    page.data.length >= 1,
  );
  TestValidator.equals(
    "refundRequestId matches",
    page.data[0].shopping_refund_request_id,
    refund.id,
  );
  // Confirm chronological order (oldest to newest)
  for (let i = 1; i < page.data.length; ++i) {
    TestValidator.predicate(
      `status ordered at index ${i}`,
      page.data[i - 1].timestamp <= page.data[i].timestamp,
    );
  }

  // 7. Seller filters by actor_type 'customer' (should match initial status entries)
  const filterByCustomerBody = {
    page: 1,
    limit: 10,
    actor_type: "customer",
  } satisfies IShoppingRefundStatusHistory.IRequest;
  const customerStatusPage: IPageIShoppingRefundStatusHistory =
    await api.functional.shopping.seller.refunds.statuses.index(connection, {
      refundRequestId: refund.id,
      body: filterByCustomerBody,
    });
  typia.assert(customerStatusPage);
  TestValidator.equals(
    "all status history actor_types are customer",
    customerStatusPage.data.every((entry) => entry.actor_type === "customer"),
    true,
  );

  // 8. Try to access another (unauthorized) refundRequestId
  const anotherRefundId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "seller cannot access unrelated refundRequestId",
    async () => {
      await api.functional.shopping.seller.refunds.statuses.index(connection, {
        refundRequestId: anotherRefundId,
        body: statusReqBody,
      });
    },
  );
}
