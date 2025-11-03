import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
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
 * Validates that a customer can retrieve split detail of their multi-seller
 * order, and cannot see other customers' splits. Also ensures sellers cannot
 * retrieve customer splits via the customer API.
 *
 * 1. Register customer A and customer B
 * 2. Register two sellers and let each create a product with one SKU
 * 3. Customer A places an order containing SKUs from both sellers, which creates
 *    two splits
 * 4. Retrieve detail for each split as the ordering customer and verify seller
 *    info, split status, subtotal, and timestamps
 * 5. As customer B, verify that attempting to access customer A's splits is denied
 * 6. As a seller, verify that attempting to access a customer's split via the
 *    customer API is denied
 */
export async function test_api_ordersplit_customer_split_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Register customer A and B
  const customerAEmail = RandomGenerator.alphaNumeric(8) + "@test.com";
  const customerAPassword = RandomGenerator.alphaNumeric(12);
  const customerA = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerAEmail,
      password: customerAPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://autobe-e2e.test/customerA",
      referrer: "https://autobe-e2e.test/welcome",
    } satisfies IShoppingCustomer.ICreate,
  });
  typia.assert(customerA);

  const customerBEmail = RandomGenerator.alphaNumeric(8) + "@test.com";
  const customerBPassword = RandomGenerator.alphaNumeric(12);
  const customerB = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerBEmail,
      password: customerBPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://autobe-e2e.test/customerB",
      referrer: "https://autobe-e2e.test/welcome",
    } satisfies IShoppingCustomer.ICreate,
  });
  typia.assert(customerB);

  // 2. Register two sellers and let each create a product/SKU
  // Seller A
  const sellerAEmail = RandomGenerator.alphaNumeric(8) + "@seller.com";
  const sellerAPassword = RandomGenerator.alphaNumeric(12);
  const sellerA = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
      display_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    } satisfies IShoppingSeller.IJoin,
  });
  typia.assert(sellerA);
  const prodACode = RandomGenerator.alphaNumeric(10);
  const productA = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: {
        code: prodACode,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        main_image_uri:
          "https://autobe-e2e-image.test/" +
          RandomGenerator.alphaNumeric(10) +
          ".jpg",
        status: "active",
        business_status: "in_review",
      } satisfies IShoppingProduct.ICreate,
    },
  );
  typia.assert(productA);
  const skuA = await api.functional.shopping.seller.products.skus.create(
    connection,
    {
      productCode: prodACode,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        price: 10000,
        is_active: true,
        status: "in_stock",
        variant_attribute_value_ids: [
          typia.random<string & tags.Format<"uuid">>(),
        ],
      } satisfies IShoppingSku.ICreate,
    },
  );
  typia.assert(skuA);

  // Seller B
  const sellerBEmail = RandomGenerator.alphaNumeric(8) + "@seller.com";
  const sellerBPassword = RandomGenerator.alphaNumeric(12);
  const sellerB = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerBEmail,
      password: sellerBPassword,
      display_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    } satisfies IShoppingSeller.IJoin,
  });
  typia.assert(sellerB);
  const prodBCode = RandomGenerator.alphaNumeric(10);
  const productB = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: {
        code: prodBCode,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        main_image_uri:
          "https://autobe-e2e-image.test/" +
          RandomGenerator.alphaNumeric(10) +
          ".jpg",
        status: "active",
        business_status: "in_review",
      } satisfies IShoppingProduct.ICreate,
    },
  );
  typia.assert(productB);
  const skuB = await api.functional.shopping.seller.products.skus.create(
    connection,
    {
      productCode: prodBCode,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        price: 15000,
        is_active: true,
        status: "in_stock",
        variant_attribute_value_ids: [
          typia.random<string & tags.Format<"uuid">>(),
        ],
      } satisfies IShoppingSku.ICreate,
    },
  );
  typia.assert(skuB);

  // 3. Customer A places an order with both SKUs
  // (No need for re-auth, just continue as current session)
  const order = await api.functional.shopping.customer.orders.create(
    connection,
    {
      body: {
        total_price: skuA.price + skuB.price,
        order_lines: [
          {
            shopping_sku_id: skuA.id,
            quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            unit_price: skuA.price,
          },
          {
            shopping_sku_id: skuB.id,
            quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            unit_price: skuB.price,
          },
        ],
        shipping_addresses: [
          {
            type: "shipping",
            recipient_name: RandomGenerator.name(),
            recipient_phone: RandomGenerator.mobile(),
            zip_code: RandomGenerator.alphaNumeric(5),
            base_address: RandomGenerator.paragraph({ sentences: 2 }),
            detail_address: RandomGenerator.paragraph({ sentences: 2 }),
            city: RandomGenerator.paragraph({ sentences: 2 }),
            state_province: RandomGenerator.paragraph({ sentences: 2 }),
            country: "TestCountry",
          } satisfies IShoppingOrderAddress.ICreate,
        ],
        payment_method: "test-pay",
      } satisfies IShoppingOrder.ICreate,
    },
  );
  typia.assert(order);
  TestValidator.predicate(
    "order splits are generated",
    order.order_splits.length >= 2,
  );

  // 4. Retrieve and validate each split as the ordering customer
  for (const split of order.order_splits) {
    const splitDetail = await api.functional.shopping.customer.orders.splits.at(
      connection,
      {
        orderCode: order.order_code,
        splitCode: split.split_code,
      },
    );
    typia.assert(splitDetail);
    TestValidator.equals("split id matches", splitDetail.id, split.id);
    TestValidator.equals(
      "split subtotal matches",
      splitDetail.subtotal_price,
      split.subtotal_price,
    );
    TestValidator.equals(
      "split status matches",
      splitDetail.status,
      split.status,
    );
    TestValidator.equals(
      "split seller matches",
      splitDetail.seller.id,
      split.seller.id,
    );
    TestValidator.predicate(
      "split created_at exists",
      typeof splitDetail.created_at === "string" && !!splitDetail.created_at,
    );
  }

  // 5. Switch to customer B and verify access to customer A's split detail is denied
  await api.functional.auth.customer.join(connection, {
    body: {
      email: customerBEmail,
      password: customerBPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://autobe-e2e.test/customerB",
      referrer: "https://autobe-e2e.test/welcome",
    } satisfies IShoppingCustomer.ICreate,
  });
  await TestValidator.error(
    "customer B cannot access another customer's split detail",
    async () => {
      await api.functional.shopping.customer.orders.splits.at(connection, {
        orderCode: order.order_code,
        splitCode: order.order_splits[0].split_code,
      });
    },
  );

  // 6. Switch to seller A and try to access customer split via customer API (should error)
  await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
      display_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    } satisfies IShoppingSeller.IJoin,
  });
  await TestValidator.error(
    "seller cannot access customer split detail via customer API",
    async () => {
      await api.functional.shopping.customer.orders.splits.at(connection, {
        orderCode: order.order_code,
        splitCode: order.order_splits[0].split_code,
      });
    },
  );
}
