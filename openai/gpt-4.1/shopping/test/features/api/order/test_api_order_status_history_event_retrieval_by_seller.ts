import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingOrderStatusHistory";
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
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingSkuImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuImage";
import type { IShoppingSkuVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuVariant";
import type { IShoppingTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingTag";

export async function test_api_order_status_history_event_retrieval_by_seller(
  connection: api.IConnection,
) {
  // 1. Register seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "sellerpass123!",
      display_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    } satisfies IShoppingSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create product
  const productCode = RandomGenerator.alphaNumeric(12);
  const product = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        main_image_uri: `https://cdn.test/${RandomGenerator.alphaNumeric(10)}.jpg`,
        status: "active",
        business_status: "approved",
      } satisfies IShoppingProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create SKU (minimal variant attributes)
  const skuCode = RandomGenerator.alphaNumeric(8);
  const sku = await api.functional.shopping.seller.products.skus.create(
    connection,
    {
      productCode: product.code,
      body: {
        sku_code: skuCode,
        price: 12345,
        is_active: true,
        status: "in_stock",
        variant_attribute_value_ids: [RandomGenerator.alphaNumeric(6)], // fake - just one string, assumption
      } satisfies IShoppingSku.ICreate,
    },
  );
  typia.assert(sku);
  // 4. Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "customerpass123!",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://test.order.com/join",
      referrer: "https://test.order.com/",
    } satisfies IShoppingCustomer.ICreate,
  });
  typia.assert(customer);
  // 5. Place order for the SKU by the customer
  const shippingAddress = {
    type: "shipping",
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    zip_code: RandomGenerator.alphaNumeric(5),
    base_address: RandomGenerator.paragraph({ sentences: 2 }),
    detail_address: null,
    city: "Seoul",
    state_province: "Seoul",
    country: "South Korea",
  } satisfies IShoppingOrderAddress.ICreate;
  const orderCreate = {
    total_price: sku.price,
    order_lines: [
      {
        shopping_sku_id: sku.id,
        quantity: 1,
        unit_price: sku.price,
      } satisfies IShoppingOrderLine.ICreate,
    ],
    shipping_addresses: [shippingAddress],
    payment_method: "bank_transfer",
  } satisfies IShoppingOrder.ICreate;
  const order = await api.functional.shopping.customer.orders.create(
    connection,
    {
      body: orderCreate,
    },
  );
  typia.assert(order);
  // 6. As seller, list status history to find a transition
  await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "sellerpass123!",
      display_name: seller.display_name,
      contact_phone: seller.contact_phone,
      status: seller.status,
    } satisfies IShoppingSeller.IJoin,
  });
  const statusPage =
    await api.functional.shopping.seller.orders.status_history.index(
      connection,
      {
        orderCode: order.order_code,
        body: { page: 1, limit: 1 },
      },
    );
  typia.assert(statusPage);
  TestValidator.predicate(
    "has at least one status history",
    statusPage.data.length > 0,
  );
  const firstEvent = statusPage.data[0];
  typia.assert(firstEvent);
  // 7. Retrieve full event details
  const detail = await api.functional.shopping.seller.orders.status_history.at(
    connection,
    {
      orderCode: order.order_code,
      orderStatusHistoryId: firstEvent.id,
    },
  );
  typia.assert(detail);
  // 8. Validate event details match summary and required fields exist
  TestValidator.equals("event id", detail.id, firstEvent.id);
  TestValidator.equals(
    "from_status",
    detail.from_status,
    firstEvent.from_status,
  );
  TestValidator.equals("to_status", detail.to_status, firstEvent.to_status);
  TestValidator.equals(
    "triggered_by",
    detail.triggered_by,
    firstEvent.triggered_by,
  );
  TestValidator.equals(
    "occurred_at",
    detail.occurred_at,
    firstEvent.occurred_at,
  );
  // 9. Validate role-based access control: another seller cannot access
  const otherSellerEmail = typia.random<string & tags.Format<"email">>();
  const otherSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: otherSellerEmail,
      password: "other123!other",
      display_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    } satisfies IShoppingSeller.IJoin,
  });
  typia.assert(otherSeller);
  await TestValidator.error(
    "other seller cannot get event detail",
    async () => {
      await api.functional.shopping.seller.orders.status_history.at(
        connection,
        {
          orderCode: order.order_code,
          orderStatusHistoryId: firstEvent.id,
        },
      );
    },
  );
}
