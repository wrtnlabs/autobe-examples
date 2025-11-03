import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingOrderFulfillment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingOrderFulfillment";
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

/**
 * Validate fulfilling order fulfillment list API for sellers.
 *
 * 1. Register and authenticate a new seller.
 * 2. Seller creates a product.
 * 3. Seller creates a SKU under the product.
 * 4. Register and authenticate a new customer.
 * 5. Customer creates an order using the SKU.
 * 6. As the seller, request the fulfillment record list for the order (using
 *    order_code).
 * 7. Assert the paginated response structure and record structure is returned as
 *    expected, with fulfillment details included or empty if not present.
 * 8. Test access control by attempting fulfillment retrieval with invalid order
 *    code or unauthorized user (optional/error scenario).
 */
export async function test_api_order_fulfillment_list_by_seller(
  connection: api.IConnection,
) {
  // 1. Register seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
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

  // 2. Seller creates a product
  const newProductCode = RandomGenerator.alphaNumeric(10);
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: {
        code: newProductCode,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        main_image_uri: `https://picsum.photos/seed/${RandomGenerator.alphaNumeric(8)}/600/600`,
        status: "active",
        business_status: "approved",
      } satisfies IShoppingProduct.ICreate,
    });
  typia.assert(product);

  // 3. Seller creates at least one SKU
  const skuCode = RandomGenerator.alphaNumeric(12);
  const sku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: product.code,
      body: {
        sku_code: skuCode,
        price: 1000,
        is_active: true,
        status: "in_stock",
        variant_attribute_value_ids: [
          typia.random<string & tags.Format<"uuid">>(),
        ],
      } satisfies IShoppingSku.ICreate,
    });
  typia.assert(sku);

  // 4. Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(12) as string &
          tags.MinLength<8> &
          tags.MaxLength<128>,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://example.com/join",
        referrer: "https://google.com/",
      } satisfies IShoppingCustomer.ICreate,
    });
  typia.assert(customer);

  // 5. Customer creates an order
  const shippingAddress = {
    type: "shipping",
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    zip_code: RandomGenerator.alphaNumeric(5),
    base_address: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    country: "South Korea",
  } satisfies IShoppingOrderAddress.ICreate;

  const orderLineQuantity = 2;
  const order: IShoppingOrder =
    await api.functional.shopping.customer.orders.create(connection, {
      body: {
        total_price: sku.price * orderLineQuantity,
        order_lines: [
          {
            shopping_sku_id: sku.id,
            quantity: orderLineQuantity as number &
              tags.Type<"int32"> &
              tags.Minimum<1>,
            unit_price: sku.price,
          } satisfies IShoppingOrderLine.ICreate,
        ],
        shipping_addresses: [shippingAddress],
        payment_method: "card",
      } satisfies IShoppingOrder.ICreate,
    });
  typia.assert(order);

  // 6. As seller (current session), request fulfillment list
  const requestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    status: undefined,
    from: undefined,
    to: undefined,
  } satisfies IShoppingOrderFulfillment.IRequest;

  const fulfillmentsPage: IPageIShoppingOrderFulfillment =
    await api.functional.shopping.seller.orders.fulfillments.index(connection, {
      orderCode: order.order_code,
      body: requestBody,
    });
  typia.assert(fulfillmentsPage);

  // 7. Assert page structure and fulfillments (should be empty or valid format)
  TestValidator.equals(
    "pagination current page returned as requested",
    fulfillmentsPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination page size default",
    fulfillmentsPage.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "fulfillments data array exists",
    Array.isArray(fulfillmentsPage.data),
  );
  if (fulfillmentsPage.data.length > 0) {
    // Validate structure of returned fulfillments
    for (const f of fulfillmentsPage.data) {
      typia.assert(f);
      TestValidator.predicate(
        "fulfillment id is uuid",
        typeof f.id === "string" && f.id.length > 0,
      );
      TestValidator.predicate(
        "quantity_fulfilled is positive",
        f.quantity_fulfilled > 0,
      );
      TestValidator.predicate(
        "fulfilled_at is date-time string",
        typeof f.fulfilled_at === "string" && f.fulfilled_at.includes("T"),
      );
      TestValidator.predicate("status is string", typeof f.status === "string");
    }
  }

  // 8. Test error for invalid order code (should not be found or forbidden)
  await TestValidator.error(
    "retrieving fulfillments with invalid order code returns error",
    async () => {
      await api.functional.shopping.seller.orders.fulfillments.index(
        connection,
        {
          orderCode: "INVALID_ORDER_CODE", // certainly doesn't exist
          body: requestBody,
        },
      );
    },
  );
}
