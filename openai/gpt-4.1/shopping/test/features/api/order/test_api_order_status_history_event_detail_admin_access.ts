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
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingSkuImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuImage";
import type { IShoppingSkuVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuVariant";
import type { IShoppingTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingTag";

export async function test_api_order_status_history_event_detail_admin_access(
  connection: api.IConnection,
) {
  // 1. Seller registers
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "sellerPassword123!",
        display_name: RandomGenerator.name(),
        contact_phone: RandomGenerator.mobile(),
        status: "pending",
      },
    });
  typia.assert(seller);

  // 2. Create Product by seller
  const productCode = RandomGenerator.alphaNumeric(10);
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.content({ paragraphs: 2 }),
        main_image_uri: "https://cdn.example.com/image.png",
        status: "active",
        business_status: "approved",
      },
    });
  typia.assert(product);

  // 3. Add SKU
  const skuCode = RandomGenerator.alphaNumeric(8);
  const sku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode,
      body: {
        sku_code: skuCode,
        price: 12000,
        is_active: true,
        status: "in_stock",
        variant_attribute_value_ids: [], // Assume empty permitted
      },
    });
  typia.assert(sku);

  // 4. Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "customerPassword123!",
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://shop.example.com/register",
        referrer: "https://shop.example.com/landing",
      },
    });
  typia.assert(customer);

  // 5. Customer creates an order with the SKU
  const address = {
    type: "shipping",
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    zip_code: RandomGenerator.alphaNumeric(5),
    base_address: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 7,
      wordMax: 12,
    }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    country: "KOR",
  } satisfies IShoppingOrderAddress.ICreate;

  const order: IShoppingOrder =
    await api.functional.shopping.customer.orders.create(connection, {
      body: {
        total_price: 12000,
        order_lines: [
          {
            shopping_sku_id: sku.id,
            quantity: 1,
            unit_price: 12000,
          },
        ],
        shipping_addresses: [address],
        payment_method: "card",
      },
    });
  typia.assert(order);

  // 6. Register as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        name: RandomGenerator.name(),
        role: "super",
        status: "active",
      },
    });
  typia.assert(admin);

  // 7. Find any available status event entry
  const statusHistory = order.status_history.find(
    (evt) => typeof evt.id === "string" && typeof evt.to_status === "string",
  );
  typia.assertGuard<IShoppingOrderStatusHistory>(statusHistory!);

  // 8. As admin, retrieve exact status event
  const fetched: IShoppingOrderStatusHistory =
    await api.functional.shopping.admin.orders.status_history.at(connection, {
      orderCode: order.order_code,
      orderStatusHistoryId: statusHistory.id,
    });
  typia.assert(fetched);

  // 9. Check all required fields exist and formats are correct
  TestValidator.equals(
    "fetched event id matches request",
    fetched.id,
    statusHistory.id,
  );
  TestValidator.predicate(
    "event has occurred_at (date-time string)",
    typeof fetched.occurred_at === "string" && !!fetched.occurred_at.match(/T/),
  );
  TestValidator.predicate(
    "from_status and to_status are present",
    typeof fetched.from_status === "string" &&
      typeof fetched.to_status === "string",
  );
  TestValidator.predicate(
    "triggered_by present",
    typeof fetched.triggered_by === "string" && fetched.triggered_by.length > 0,
  );

  // 10. Negative: attempt unauthorized access to status event of a different order
  const anotherOrderCode = RandomGenerator.alphaNumeric(12);
  const randomEventId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "admin cannot access non-existent order status event",
    async () => {
      await api.functional.shopping.admin.orders.status_history.at(connection, {
        orderCode: anotherOrderCode,
        orderStatusHistoryId: randomEventId,
      });
    },
  );
}
