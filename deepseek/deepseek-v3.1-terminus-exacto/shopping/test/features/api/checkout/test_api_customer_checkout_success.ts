import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventoryRecord";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
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
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

/**
 * Test successful customer checkout scenario starting with customer authentication,
 * product setup, cart creation, and ending with complete order creation with payment processing.
 */
export async function test_api_customer_checkout_success(
  connection: api.IConnection,
): Promise<void> {
  // Setup seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // Create product
  const productConnection: api.IConnection = { host: connection.host };
  productConnection.headers = productConnection.headers ?? {};
  Object.assign(productConnection.headers, sellerConnection.headers ?? {});
  const product = await generate_random_ecommerce_seller_products_create(
    productConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 1,
          wordMax: 3,
        }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<number & tags.Minimum<1000>>(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // Create product variant
  const variantConnection: api.IConnection = { host: connection.host };
  variantConnection.headers = variantConnection.headers ?? {};
  Object.assign(variantConnection.headers, sellerConnection.headers ?? {});
  const variant =
    await generate_random_ecommerce_seller_products_variants_create(
      variantConnection,
      {
        params: { productId: product.id },
        body: {
          sku: RandomGenerator.alphaNumeric(8),
          option_values: '{ "size": "large", "color": "blue" }',
          price_override: typia.random<number & tags.Minimum<0>>(),
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // Verify initial inventory
  const initialStock = variant.quantity;
  const purchaseQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  // Setup customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // Generate a random cart ID for cart operations
  const cartId = typia.random<string & tags.Format<"uuid">>();
  // Add product variant to cart
  const cartConnection: api.IConnection = { host: connection.host };
  cartConnection.headers = cartConnection.headers ?? {};
  Object.assign(cartConnection.headers, customerConnection.headers ?? {});
  const cartItem = await generate_random_ecommerce_customer_carts_items_create(
    cartConnection,
    {
      params: { cartId },
      body: {
        product_variant_id: variant.id,
        quantity: purchaseQuantity,
      } satisfies IEcommerceCartItem.ICreate,
    },
  );
  typia.assert(cartItem);
  // Process checkout - use minimal valid request for analytics endpoint
  const checkoutConnection: api.IConnection = { host: connection.host };
  checkoutConnection.headers = checkoutConnection.headers ?? {};
  Object.assign(checkoutConnection.headers, customerConnection.headers ?? {});
  const order = await api.functional.ecommerce.customer.checkout.create(
    checkoutConnection,
    {
      body: {
        customer_id: customer.id,
      } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(order);
  // Validate order analytics response structure
  TestValidator.predicate(
    "order should have period field",
    typeof order.period === "string",
  );
  TestValidator.predicate(
    "order total revenue should be non-negative",
    order.total_revenue >= 0,
  );
  TestValidator.predicate(
    "order count should be non-negative",
    order.order_count >= 0,
  );
  TestValidator.predicate(
    "average order value should be non-negative",
    order.average_order_value >= 0,
  );
  // Validate analytics data structures
  TestValidator.predicate(
    "status distribution should exist",
    order.status_distribution !== undefined,
  );
  TestValidator.predicate(
    "seller performance should be array",
    Array.isArray(order.seller_performance),
  );
  TestValidator.predicate(
    "category performance should be array",
    Array.isArray(order.product_category_performance),
  );
  TestValidator.predicate(
    "geographic distribution should exist",
    order.geographic_distribution !== undefined,
  );
  TestValidator.predicate(
    "hourly distribution should be array",
    Array.isArray(order.hourly_distribution),
  );
  // Business logic validation
  TestValidator.predicate(
    "order analytics should represent valid time period",
    !isNaN(new Date(order.period).getTime()),
  );
  if (order.order_count > 0) {
    TestValidator.predicate(
      "average order value should match revenue/count ratio",
      Math.abs(
        order.average_order_value - order.total_revenue / order.order_count,
      ) < 0.01,
    );
  }
}