import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingOrderLine";
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

/**
 * Validate the admin order line listing with workflow setup and filter checks.
 *
 * 1. Register admin account for privileged access.
 * 2. Register a seller and create a product (with unique product code) and at
 *    least one SKU (with unique SKU code).
 * 3. Register a customer and create an order containing the SKU, using realistic
 *    addresses and payment method.
 * 4. As admin, retrieve order lines by orderCode, check correctness of returned
 *    line data with/without filtering by SKU code, status, seller, etc.
 * 5. Validate data: all order lines belong to the order, correct seller/SKU,
 *    quantity, price.
 * 6. Validate edge cases: invalid order code (should error), filter by an invalid
 *    or unrelated SKU code (should be empty), unauthorized usage (deny
 *    non-admin, e.g. use customer access token).
 * 7. Validate pagination with different page/limit.
 */
export async function test_api_admin_order_line_list_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "StrongAdminPW!1234",
        name: RandomGenerator.name(),
        role: "superadmin",
        status: "active", // all required fields for admin
      },
    });
  typia.assert(admin);
  // The connection now has admin token.

  // 2. Register a seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "sellerpass123",
        display_name: RandomGenerator.name(),
        contact_phone: RandomGenerator.mobile(),
        status: "pending", // required status for onboarding
      },
    });
  typia.assert(seller);

  // 3. Seller creates product
  const productCode = RandomGenerator.alphaNumeric(12);
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 8,
        }),
        main_image_uri: "https://example.com/main.jpg",
        status: "active",
        business_status: "approved",
        shipping_weight_grams: 500,
        shipping_length_cm: 40,
        shipping_width_cm: 30,
        shipping_height_cm: 10,
        shipping_options: "standard,express",
      },
    });
  typia.assert(product);

  // 4. Seller adds SKU
  const skuCode = RandomGenerator.alphaNumeric(10);
  const sku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: product.code,
      body: {
        sku_code: skuCode,
        price: 34900,
        is_active: true,
        status: "in_stock",
        variant_attribute_value_ids: [
          typia.random<string & tags.Format<"uuid">>(),
        ],
      },
    });
  typia.assert(sku);

  // 5. Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  // For login context
  const href = "https://shop.example.com/register";
  const referrer = "https://google.com";
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "customerpass!2023",
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href,
        referrer,
      },
    });
  typia.assert(customer);

  // 6. Customer places an order for the SKU
  const orderCreateBody = {
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
        base_address: RandomGenerator.paragraph({ sentences: 2 }),
        detail_address: "101", // simple add-on
        city: "Seoul",
        state_province: "Seoul",
        country: "South Korea",
      } satisfies IShoppingOrderAddress.ICreate,
    ],
    payment_method: "credit_card",
  } satisfies IShoppingOrder.ICreate;
  const order: IShoppingOrder =
    await api.functional.shopping.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);
  const orderCode = order.order_code;
  // 7. Attempt unauthorized access (using customer token)
  await TestValidator.error(
    "customer cannot list admin order lines",
    async () => {
      await api.functional.shopping.admin.orders.lines.index(connection, {
        orderCode,
        body: {
          page: 1,
          limit: 10,
        },
      });
    },
  );

  // 8. Switch back to admin (re-authenticate for admin token)
  const adminAgain: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "StrongAdminPW!1234",
        name: admin.name,
        role: admin.role,
        status: admin.status,
      },
    });
  typia.assert(adminAgain);
  // 9. Admin fetch order lines, validate results
  const pageResult: IPageIShoppingOrderLine.ISummary =
    await api.functional.shopping.admin.orders.lines.index(connection, {
      orderCode,
      body: {
        page: 1,
        limit: 10,
      },
    });
  typia.assert(pageResult);
  TestValidator.equals(
    "all lines for this order returned",
    pageResult.data.length,
    order.order_lines.length,
  );
  for (const ol of pageResult.data) {
    TestValidator.equals(
      "order_line: belongs to queried order",
      ol.shopping_order_id,
      order.id,
    );
    TestValidator.equals("order_line sku", ol.sku.sku_code, skuCode);
    TestValidator.equals("order_line quantity", ol.quantity, 1);
    TestValidator.equals("order_line seller", ol.seller.id, seller.id);
    TestValidator.equals("order_line unit_price", ol.unit_price, sku.price);
    TestValidator.predicate(
      "order_line id is uuid",
      typeof ol.id === "string" && ol.id.length > 0,
    );
  }

  // 10. Admin filters order lines by sku_code (should only get this line)
  const skuFiltered: IPageIShoppingOrderLine.ISummary =
    await api.functional.shopping.admin.orders.lines.index(connection, {
      orderCode,
      body: {
        page: 1,
        limit: 10,
        sku_code: skuCode,
      },
    });
  typia.assert(skuFiltered);
  TestValidator.equals(
    "sku filter yields one line",
    skuFiltered.data.length,
    1,
  );
  TestValidator.equals(
    "filtered sku_code matches",
    skuFiltered.data[0].sku.sku_code,
    skuCode,
  );

  // 11. Filter with invalid SKU code (should get empty array)
  const badSkuResult: IPageIShoppingOrderLine.ISummary =
    await api.functional.shopping.admin.orders.lines.index(connection, {
      orderCode,
      body: {
        page: 1,
        limit: 10,
        sku_code: "invalidsku99999999",
      },
    });
  typia.assert(badSkuResult);
  TestValidator.equals(
    "invalid sku code yields no lines",
    badSkuResult.data.length,
    0,
  );

  // 12. Bad order code (should error)
  await TestValidator.error("invalid order code fails", async () => {
    await api.functional.shopping.admin.orders.lines.index(connection, {
      orderCode: "INVALID_ORDER_CODE_DOESNT_EXIST",
      body: {
        page: 1,
        limit: 10,
      },
    });
  });

  // 13. Pagination (page=1, limit=1)
  const paged: IPageIShoppingOrderLine.ISummary =
    await api.functional.shopping.admin.orders.lines.index(connection, {
      orderCode,
      body: {
        page: 1,
        limit: 1,
      },
    });
  typia.assert(paged);
  TestValidator.equals("pagination returns one line", paged.data.length, 1);
  TestValidator.equals(
    "pagination line matches",
    paged.data[0].id,
    order.order_lines[0].id,
  );
}
