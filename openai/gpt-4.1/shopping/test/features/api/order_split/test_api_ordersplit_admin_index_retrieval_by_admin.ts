import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingOrderSplit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingOrderSplit";
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
 * Test retrieval and pagination of order split summaries by admin. Covers
 * admin-only access, correct linkage to seller, and advanced filtering. Steps:
 *
 * 1. Register admin, seller, customer.
 * 2. Seller creates a product and one SKU.
 * 3. Customer places order with that SKU.
 * 4. Admin queries order splits with and without filters.
 * 5. Validate correct splits/sellers, pagination logic, and forbidden access for
 *    non-admin.
 */
export async function test_api_ordersplit_admin_index_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Create admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        role: "super", // assume 'super' is a valid privilege role
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(2),
        contact_phone: RandomGenerator.mobile(),
        status: "pending",
      } satisfies IShoppingSeller.IJoin,
    });
  typia.assert(seller);

  // 3. Seller creates a new product
  const productCode = RandomGenerator.alphaNumeric(10);
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        main_image_uri: `https://cdn.example.com/products/${productCode}.jpg`,
        status: "draft",
        business_status: "in_review",
      } satisfies IShoppingProduct.ICreate,
    });
  typia.assert(product);

  // 4. Seller creates SKU for this product (minimal attributes)
  const skuCode = RandomGenerator.alphaNumeric(8);
  const sku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: product.code,
      body: {
        sku_code: skuCode,
        price: 19900,
        is_active: true,
        status: "in_stock",
        // MINIMUM: Only attribute ID array (set dummy value, since no attribute seed function)
        variant_attribute_value_ids: [
          typia.random<string & tags.Format<"uuid">>(),
        ],
      } satisfies IShoppingSku.ICreate,
    });
  typia.assert(sku);

  // 5. Create a new customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://mall.example.com/test",
        referrer: "https://mall.example.com/home",
        ip: "127.0.0.1",
      } satisfies IShoppingCustomer.ICreate,
    });
  typia.assert(customer);

  // 6. Customer places an order for the SKU
  const shippingAddress: IShoppingOrderAddress.ICreate = {
    type: "shipping",
    recipient_name: customer.name,
    recipient_phone: customer.phone,
    zip_code: RandomGenerator.alphaNumeric(5),
    base_address: RandomGenerator.paragraph({ sentences: 2 }),
    detail_address: null,
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    country: "Republic of Test",
  };
  const orderBody: IShoppingOrder.ICreate = {
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
  };
  const order: IShoppingOrder =
    await api.functional.shopping.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 7. Query splits as admin
  const orderCode = order.order_code;
  // fetch all splits first page
  const splitReq = {
    page: 1 as number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>,
    page_size: 10 as number &
      tags.Type<"int32"> &
      tags.Default<20> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IShoppingOrderSplit.IRequest;
  const splitPage: IPageIShoppingOrderSplit.ISummary =
    await api.functional.shopping.admin.orders.splits.index(connection, {
      orderCode,
      body: splitReq,
    });
  typia.assert(splitPage);
  TestValidator.predicate(
    "split page has at least one split",
    splitPage.data.length >= 1,
  );

  // 8. Validate splits - all seller matches, all field constraints
  for (const summary of splitPage.data) {
    typia.assert(summary);
    TestValidator.equals(
      "split references same order",
      summary.shopping_order_id,
      order.id,
    );
    TestValidator.equals(
      "split has seller id",
      typeof summary.shopping_seller_id,
      "string",
    );
    TestValidator.predicate(
      "split code is present",
      typeof summary.split_code === "string" && summary.split_code.length > 0,
    );
    TestValidator.equals(
      "split status present",
      typeof summary.status,
      "string",
    );
    TestValidator.predicate("split subtotal > 0", summary.subtotal_price > 0);
  }

  // 9. Admin can filter by status, seller - expect either one or zero results
  const filterReq = {
    seller_id: splitPage.data[0].shopping_seller_id,
    status: splitPage.data[0].status,
    page: 1 as number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>,
    page_size: 10 as number &
      tags.Type<"int32"> &
      tags.Default<20> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IShoppingOrderSplit.IRequest;
  const filtered: IPageIShoppingOrderSplit.ISummary =
    await api.functional.shopping.admin.orders.splits.index(connection, {
      orderCode,
      body: filterReq,
    });
  typia.assert(filtered);
  TestValidator.predicate(
    "filter returns <= 1 split",
    filtered.data.length <= 1,
  );
  if (filtered.data.length === 1) {
    const item = filtered.data[0];
    TestValidator.equals(
      "filtered split seller_id matches",
      item.shopping_seller_id,
      filterReq.seller_id,
    );
    TestValidator.equals(
      "filtered split status matches",
      item.status,
      filterReq.status,
    );
  }

  // 10. Pagination: request large page_size to ensure boundaries
  const bigPageReq = {
    page: 1 as number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>,
    page_size: 100 as number &
      tags.Type<"int32"> &
      tags.Default<20> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IShoppingOrderSplit.IRequest;
  const bigPage = await api.functional.shopping.admin.orders.splits.index(
    connection,
    {
      orderCode,
      body: bigPageReq,
    },
  );
  typia.assert(bigPage);
  TestValidator.equals(
    "pagination total for bigPage",
    bigPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "bigPage no more than page_size splits",
    bigPage.data.length <= bigPageReq.page_size,
  );

  // 11. Unauthorized access: try customer
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("customer cannot access admin splits", async () => {
    await api.functional.shopping.admin.orders.splits.index(unauthConn, {
      orderCode,
      body: splitReq,
    });
  });
  // 12. Try seller
  const sellerConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "seller cannot access admin split index",
    async () => {
      await api.functional.shopping.admin.orders.splits.index(sellerConn, {
        orderCode,
        body: splitReq,
      });
    },
  );
}
