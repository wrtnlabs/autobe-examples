import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingOrderLine";
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

export async function test_api_order_line_search_by_customer(
  connection: api.IConnection,
) {
  // 1. Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerBody = {
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://customer.join/" + RandomGenerator.alphaNumeric(8),
    referrer: "https://referrer.test/" + RandomGenerator.alphaNumeric(6),
  } satisfies IShoppingCustomer.ICreate;
  const customer = await api.functional.auth.customer.join(connection, {
    body: customerBody,
  });
  typia.assert(customer);

  // 2. Register a seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerBody,
  });
  typia.assert(seller);

  // 3. Seller creates a product
  const productCode = "P-" + RandomGenerator.alphaNumeric(8);
  const productBody = {
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    main_image_uri: "https://image.test/" + RandomGenerator.alphaNumeric(8),
    status: "active",
    business_status: "approved",
    shipping_weight_grams: 800,
    shipping_length_cm: 30,
    shipping_width_cm: 25,
    shipping_height_cm: 11,
    shipping_options: "default options",
  } satisfies IShoppingProduct.ICreate;
  const product = await api.functional.shopping.seller.products.create(
    connection,
    { body: productBody },
  );
  typia.assert(product);

  // 4. Seller creates SKUs for the product
  const skus = await ArrayUtil.asyncRepeat(3, async (idx) => {
    const skuCode = `${productCode}-SKU${idx + 1}`;
    const skuBody = {
      sku_code: skuCode,
      price: 1000 * (idx + 1),
      is_active: true,
      barcode: undefined,
      status: "in_stock",
      variant_attribute_value_ids: [
        typia.random<string & tags.Format<"uuid">>(),
      ],
    } satisfies IShoppingSku.ICreate;
    const sku = await api.functional.shopping.seller.products.skus.create(
      connection,
      { productCode: product.code, body: skuBody },
    );
    typia.assert(sku);
    return sku;
  });

  // 5. Customer creates an order with the SKUs
  const orderLines = skus.map((sku) => ({
    shopping_sku_id: sku.id,
    quantity: 1,
    unit_price: sku.price,
  })) satisfies IShoppingOrderLine.ICreate[];
  const addressBody = {
    type: "shipping",
    recipient_name: customer.name,
    recipient_phone: customer.phone,
    zip_code: "12345",
    base_address: "1 Test Ave",
    detail_address: null,
    city: "Testville",
    state_province: "Test State",
    country: "Testland",
  } satisfies IShoppingOrderAddress.ICreate;
  const orderBody = {
    total_price: orderLines.reduce(
      (sum, l) => sum + l.unit_price * l.quantity,
      0,
    ),
    order_lines: orderLines,
    shipping_addresses: [addressBody],
    payment_method: "card",
    coupon_code: null,
  } satisfies IShoppingOrder.ICreate;
  const order = await api.functional.shopping.customer.orders.create(
    connection,
    { body: orderBody },
  );
  typia.assert(order);

  // 6. Retrieve paginated order lines
  const request: IShoppingOrderLine.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 2 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sort_by: "unit_price",
    sort_order: "desc",
    status: undefined,
    sku_code: undefined,
    seller_id: undefined,
    fulfillment_status: undefined,
    created_from: undefined,
    created_to: undefined,
  };
  const resPage = await api.functional.shopping.customer.orders.lines.index(
    connection,
    { orderCode: order.order_code, body: request },
  );
  typia.assert(resPage);
  TestValidator.predicate("page size", resPage.data.length <= request.limit);
  TestValidator.equals(
    "order line count matches skus",
    order.order_lines.length,
    skus.length,
  );

  // Check returned lines match expected SKUs and content
  skus.forEach((sku) => {
    TestValidator.predicate(
      `SKU ${sku.id} present in order lines`,
      order.order_lines.some((line) => line.sku.id === sku.id),
    );
  });

  // Filter by SKU code
  const skuCodeToSearch = skus[0].sku_code;
  const filterReq: IShoppingOrderLine.IRequest = {
    ...request,
    sku_code: skuCodeToSearch,
  };
  const filterPage = await api.functional.shopping.customer.orders.lines.index(
    connection,
    { orderCode: order.order_code, body: filterReq },
  );
  typia.assert(filterPage);
  TestValidator.predicate(
    "filtered order lines only match SKU code",
    filterPage.data.every((line) => line.sku.sku_code === skuCodeToSearch),
  );

  // 7. Unauthorized access: different customer attempts to retrieve lines
  const otherCustomerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://customer.join/" + RandomGenerator.alphaNumeric(8),
    referrer: "https://referrer.test/" + RandomGenerator.alphaNumeric(6),
  } satisfies IShoppingCustomer.ICreate;
  const otherCustomer = await api.functional.auth.customer.join(connection, {
    body: otherCustomerBody,
  });
  typia.assert(otherCustomer);
  await TestValidator.error(
    "unauthorized customer cannot access other's order lines",
    async () => {
      await api.functional.shopping.customer.orders.lines.index(connection, {
        orderCode: order.order_code,
        body: request,
      });
    },
  );

  // 8. Requesting lines for a non-existent order
  await TestValidator.error(
    "non-existent order lines returns error",
    async () => {
      await api.functional.shopping.customer.orders.lines.index(connection, {
        orderCode: "NON_EXISTENT_ORDER_CODE",
        body: request,
      });
    },
  );
}
