import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_cart_items_create";
import { generate_random_ecommerce_mall_customer_customers_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_checkout_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_order_items_retrieval_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller and set up product
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Get first variant from product
  const variant = product.variants[0];
  // 2. Set inventory for the variant
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variant.id },
      body: {
        quantity: 100,
        operationType: "restock",
        reason: "Initial stock",
      },
    },
  );
  // 3. Create customer and add to cart
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const cart =
    await generate_random_ecommerce_mall_customer_customers_cart_items_create(
      customerConnection,
      {
        body: { productVariantId: variant.id, quantity: 2 },
      },
    );
  typia.assert(cart);
  // 4. Checkout to create order
  const order =
    await generate_random_ecommerce_mall_customer_customers_checkout_create(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(order);
  // 5. Retrieve order items
  const orderItemsResponse =
    await api.functional.ecommerceMall.customer.ecommerceMall.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(orderItemsResponse);
  // 6. Validate response structure
  TestValidator.equals(
    "has pagination metadata",
    orderItemsResponse.pagination !== null,
    true,
  );
  // Access pagination properties through the nested structure
  TestValidator.predicate(
    "pagination has current page",
    orderItemsResponse.pagination.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    orderItemsResponse.pagination.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has records count",
    orderItemsResponse.pagination.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination has pages count",
    orderItemsResponse.pagination.pagination.pages >= 1,
  );
  // 7. Validate order items data
  TestValidator.predicate(
    "has at least one order item",
    orderItemsResponse.data.length >= 1,
  );
  for (const item of orderItemsResponse.data) {
    // Validate product snapshot structure
    TestValidator.equals(
      "has product snapshot",
      item.productSnapshot !== null,
      true,
    );
    TestValidator.predicate(
      "has product name",
      item.productSnapshot.name.length > 0,
    );
    TestValidator.predicate(
      "has valid base price",
      item.productSnapshot.basePrice >= 0,
    );
    TestValidator.predicate(
      "has category name",
      item.productSnapshot.categoryName.length > 0,
    );
    TestValidator.predicate(
      "has source type",
      item.productSnapshot.sourceType.length > 0,
    );
    // Validate variant snapshot structure
    TestValidator.equals(
      "has variant snapshot",
      item.variantSnapshot !== null,
      true,
    );
    TestValidator.predicate(
      "has variant sku",
      item.variantSnapshot.sku.length > 0,
    );
    TestValidator.predicate(
      "has valid stock quantity",
      item.variantSnapshot.stock_quantity >= 0,
    );
    // Validate seller shop name
    TestValidator.predicate(
      "has seller shop name",
      item.sellerShopName.length > 0,
    );
    // Validate order item fields
    TestValidator.predicate("has valid quantity", item.quantity >= 1);
    TestValidator.predicate("has valid unit price", item.unitPrice >= 0);
    TestValidator.equals(
      "has valid status",
      ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
        item.status,
      ),
      true,
    );
  }
  // 8. Validate ordering (descending by created_at)
  for (let i = 1; i < orderItemsResponse.data.length; i++) {
    const prevItem = orderItemsResponse.data[i - 1];
    const currItem = orderItemsResponse.data[i];
    TestValidator.predicate(
      "order items ordered by created_at descending",
      prevItem.createdAt >= currItem.createdAt,
    );
  }
}
