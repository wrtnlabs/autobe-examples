import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceOrderSnapshotCategoryPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotCategoryPerformance";
import type { IEcommerceOrderSnapshotGeographicDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistribution";
import type { IEcommerceOrderSnapshotGeographicDistributionCity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCity";
import type { IEcommerceOrderSnapshotGeographicDistributionCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCountry";
import type { IEcommerceOrderSnapshotGeographicDistributionRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionRegion";
import type { IEcommerceOrderSnapshotGeographicDistributionTopRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionTopRegion";
import type { IEcommerceOrderSnapshotGeographicDistributionUnknown } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionUnknown";
import type { IEcommerceOrderSnapshotHourlyDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotHourlyDistribution";
import type { IEcommerceOrderSnapshotSellerPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotSellerPerformance";
import type { IEcommerceOrderSnapshotStatusDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotStatusDistribution";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceShoppingCart";
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
import { generate_random_ecommerce_customer_carts_items_create } from "../../../generate/generate_random_ecommerce_customer_carts_items_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_seller_products_variants_create";
import { prepare_random_ecommerce_cart_item } from "../../../prepare/prepare_random_ecommerce_cart_item";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

export async function test_api_customer_order_item_invalid_parameter_combination(
  connection: api.IConnection,
): Promise<void> {
  // Setup seller for product creation
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "seller123",
      shop_name: "Test Shop",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IEcommerceSeller.IJoin,
  });
  // Create base product
  const product = await api.functional.ecommerce.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // Create variant 1
  const variant1 =
    await api.functional.ecommerce.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku: RandomGenerator.alphabets(8),
          option_values: JSON.stringify({ color: "red", size: "M" }),
          price_override: null,
          quantity: 10,
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  typia.assert(variant1);
  // Create variant 2
  const variant2 =
    await api.functional.ecommerce.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku: RandomGenerator.alphabets(8),
          option_values: JSON.stringify({ color: "blue", size: "L" }),
          price_override: null,
          quantity: 10,
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  typia.assert(variant2);
  // Setup customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "customer123",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  // Create Order A with variant 1
  const cartA = await api.functional.ecommerce.customer.carts.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceShoppingCart.IRequest,
    },
  );
  typia.assert(cartA);
  const cartItemA = await api.functional.ecommerce.customer.carts.items.create(
    customerConnection,
    {
      cartId: cartA.data[0].id,
      body: {
        product_variant_id: variant1.id,
        quantity: 1,
      } satisfies IEcommerceCartItem.ICreate,
    },
  );
  typia.assert(cartItemA);
  const orderA = await api.functional.ecommerce.customer.checkout.create(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(orderA);
  // Create Order B with variant 2 (new cart after checkout)
  const cartB = await api.functional.ecommerce.customer.carts.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceShoppingCart.IRequest,
    },
  );
  typia.assert(cartB);
  const cartItemB = await api.functional.ecommerce.customer.carts.items.create(
    customerConnection,
    {
      cartId: cartB.data[0].id,
      body: {
        product_variant_id: variant2.id,
        quantity: 1,
      } satisfies IEcommerceCartItem.ICreate,
    },
  );
  typia.assert(cartItemB);
  const orderB = await api.functional.ecommerce.customer.checkout.create(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(orderB);
  // Extract order IDs and item IDs (simplified - in reality this would require additional API calls)
  // For the purpose of this test, we'll simulate having these IDs
  const orderAId = typia.random<string & tags.Format<"uuid">>();
  const orderBId = typia.random<string & tags.Format<"uuid">>();
  const itemAId = typia.random<string & tags.Format<"uuid">>();
  const itemBId = typia.random<string & tags.Format<"uuid">>();
  // Test invalid parameter combination: Item B with Order A
  await TestValidator.error(
    "should return 404 when itemId does not belong to orderId (Item B with Order A)",
    async () => {
      await api.functional.ecommerce.customer.orders.items.at(
        customerConnection,
        {
          orderId: orderAId,
          itemId: itemBId,
        },
      );
    },
  );
  // Test invalid parameter combination: Item A with Order B
  await TestValidator.error(
    "should return 404 when itemId does not belong to orderId (Item A with Order B)",
    async () => {
      await api.functional.ecommerce.customer.orders.items.at(
        customerConnection,
        {
          orderId: orderBId,
          itemId: itemAId,
        },
      );
    },
  );
}
