import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

export async function test_api_admin_orders_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller setup - join and create product with variant
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          stock: 100,
        },
      },
    );
  typia.assert(variant);
  // 3. Customer setup - join, add to cart, and checkout to create paid order
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: "Test User",
        recipientPhone: "01012345678",
        streetAddress: "123 Test St",
        city: "Seoul",
        state: null,
        postalCode: "12345",
        country: "South Korea",
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  TestValidator.equals("order status should be paid", order.status, "paid");
  // 4. Admin filters orders by 'paid' status
  const paidOrdersResponse =
    await api.functional.ecommerceMall.admin.orders.index(adminConnection, {
      body: {
        status: "paid",
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallOrder.IRequest,
    });
  typia.assert(paidOrdersResponse);
  // 5. Verify only paid orders are returned
  const allPaid = paidOrdersResponse.data.every((o) => o.status === "paid");
  TestValidator.predicate(
    "all returned orders should be 'paid' status",
    allPaid,
  );
  const orderFoundInPaid = paidOrdersResponse.data.some(
    (o) => o.id === order.id,
  );
  TestValidator.predicate(
    "order should appear in paid filter results",
    orderFoundInPaid,
  );
  // 6. Admin filters orders by 'shipped' status (should not include paid order)
  const shippedOrdersResponse =
    await api.functional.ecommerceMall.admin.orders.index(adminConnection, {
      body: {
        status: "shipped",
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallOrder.IRequest,
    });
  typia.assert(shippedOrdersResponse);
  const orderFoundInShipped = shippedOrdersResponse.data.some(
    (o) => o.id === order.id,
  );
  TestValidator.predicate(
    "order should NOT appear in shipped filter results",
    !orderFoundInShipped,
  );
  // 7. Admin filters orders by 'delivered' status (should not include paid order)
  const deliveredOrdersResponse =
    await api.functional.ecommerceMall.admin.orders.index(adminConnection, {
      body: {
        status: "delivered",
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallOrder.IRequest,
    });
  typia.assert(deliveredOrdersResponse);
  const orderFoundInDelivered = deliveredOrdersResponse.data.some(
    (o) => o.id === order.id,
  );
  TestValidator.predicate(
    "order should NOT appear in delivered filter results",
    !orderFoundInDelivered,
  );
  // 8. Admin filters without status (all orders)
  const allOrdersResponse =
    await api.functional.ecommerceMall.admin.orders.index(adminConnection, {
      body: {
        status: null,
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallOrder.IRequest,
    });
  typia.assert(allOrdersResponse);
  const orderFoundInAll = allOrdersResponse.data.some((o) => o.id === order.id);
  TestValidator.predicate(
    "order should appear when no status filter applied",
    orderFoundInAll,
  );
}
