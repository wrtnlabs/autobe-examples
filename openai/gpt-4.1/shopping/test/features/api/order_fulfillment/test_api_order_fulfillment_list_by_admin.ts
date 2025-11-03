import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingOrderFulfillment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingOrderFulfillment";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import type { IShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeValue";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrder";
import type { IShoppingOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderAddress";
import type { IShoppingOrderFulfillment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderFulfillment";
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

export async function test_api_order_fulfillment_list_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin & authenticate
  const adminEmail = `admin+${RandomGenerator.alphaNumeric(8)}@admin.com`;
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
  const sellerEmail = `seller+${RandomGenerator.alphaNumeric(8)}@seller.com`;
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        contact_phone: RandomGenerator.mobile(),
        status: "pending",
      } satisfies IShoppingSeller.IJoin,
    });
  typia.assert(seller);

  // 3. Create product by seller
  const productCode = RandomGenerator.alphaNumeric(12);
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 10 }),
        main_image_uri: `https://img.example.com/${RandomGenerator.alphaNumeric(16)}.jpg`,
        status: "draft",
        business_status: "in_review",
      } satisfies IShoppingProduct.ICreate,
    });
  typia.assert(product);

  // 4. Create SKU by seller
  const skuCode = RandomGenerator.alphaNumeric(10);
  const sku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: productCode,
      body: {
        sku_code: skuCode,
        price: 10000,
        is_active: true,
        barcode: null,
        status: "in_stock",
        variant_attribute_value_ids: [
          typia.random<string & tags.Format<"uuid">>(),
        ],
      } satisfies IShoppingSku.ICreate,
    });
  typia.assert(sku);

  // 5. Customer registers
  const customerEmail = `customer+${RandomGenerator.alphaNumeric(8)}@mail.com`;
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: `https://www.example.com/register`,
        referrer: `https://www.example.com/`,
        ip: null,
      } satisfies IShoppingCustomer.ICreate,
    });
  typia.assert(customer);

  // 6. Customer creates an order referencing the SKU
  const order: IShoppingOrder =
    await api.functional.shopping.customer.orders.create(connection, {
      body: {
        total_price: 10000,
        order_lines: [
          {
            shopping_sku_id: sku.id,
            quantity: 1,
            unit_price: 10000,
          } satisfies IShoppingOrderLine.ICreate,
        ],
        shipping_addresses: [
          {
            type: "shipping",
            recipient_name: RandomGenerator.name(),
            recipient_phone: RandomGenerator.mobile(),
            zip_code: "12345",
            base_address: "123 Main Street",
            detail_address: null,
            city: "Seoul",
            state_province: "Seoul",
            country: "South Korea",
          } satisfies IShoppingOrderAddress.ICreate,
        ],
        payment_method: "card",
        coupon_code: null,
      } satisfies IShoppingOrder.ICreate,
    });
  typia.assert(order);

  // 7. Admin retrieves fulfillments for this order (expecting none yet)
  const reqBody: IShoppingOrderFulfillment.IRequest = {
    page: 1,
    limit: 10,
  };
  const fulfillmentsPage: IPageIShoppingOrderFulfillment =
    await api.functional.shopping.admin.orders.fulfillments.index(connection, {
      orderCode: order.order_code,
      body: reqBody,
    });
  typia.assert(fulfillmentsPage);
  TestValidator.equals(
    "fulfillment page result may be empty (no shipment yet)",
    fulfillmentsPage.pagination.current,
    1,
  );

  // 8. Try different filter (status, date filtering)
  const futureDate = new Date(Date.now() + 86400000).toISOString();
  const filteredFulfillments: IPageIShoppingOrderFulfillment =
    await api.functional.shopping.admin.orders.fulfillments.index(connection, {
      orderCode: order.order_code,
      body: {
        page: 1,
        limit: 5,
        status: "pending",
        from: futureDate,
        to: futureDate,
      },
    });
  typia.assert(filteredFulfillments);
  TestValidator.equals(
    "applying future date range yields 0 records",
    filteredFulfillments.data.length,
    0,
  );

  // 9. Error case: non-existing order code
  await TestValidator.error("invalid order code gives error", async () => {
    await api.functional.shopping.admin.orders.fulfillments.index(connection, {
      orderCode: "NONEXISTENT_CODE",
      body: reqBody,
    });
  });
}
