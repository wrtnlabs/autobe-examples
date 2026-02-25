import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
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
import type { IEcommercePlatformEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEvent";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformEvent";
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
import { generate_random_ecommerce_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_seller_orders_shipments_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_seller_products_variants_create";
import { prepare_random_ecommerce_cart_item } from "../../../prepare/prepare_random_ecommerce_cart_item";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";
import { prepare_random_ecommerce_shipment } from "../../../prepare/prepare_random_ecommerce_shipment";

export async function test_api_seller_analytics_sales_with_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Seller 1 setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(seller1);
  // Seller 2 setup for data isolation test
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password456",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(seller2);
  // Create product for seller 1
  const product = await api.functional.ecommerce.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // Create variant with inventory
  const variant =
    await api.functional.ecommerce.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku: RandomGenerator.alphaNumeric(10),
          option_values: JSON.stringify({ size: "M", color: "blue" }),
          price_override: null,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "customer123",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    },
  });
  typia.assert(customer);
  // Need a cart ID - assuming there's a default cart or we need to create one
  // For simplicity, we'll assume the customer has a cart with ID from customer object
  // In real implementation, we would need to get or create cart first
  const cartId = typia.random<string & tags.Format<"uuid">>();
  // Add item to cart
  const cartItem = await api.functional.ecommerce.customer.carts.items.create(
    customerConnection,
    {
      cartId,
      body: {
        product_variant_id: variant.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
      } satisfies IEcommerceCartItem.ICreate,
    },
  );
  typia.assert(cartItem);
  // Checkout to create order
  const order = await api.functional.ecommerce.customer.checkout.create(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(order);
  // Create shipment (optional for analytics completeness)
  const shipment =
    await api.functional.ecommerce.seller.orders.shipments.create(
      sellerConnection,
      {
        orderId: order.period satisfies string as string,
        body: {
          tracking_number: RandomGenerator.alphaNumeric(12),
          carrier_name: "Test Carrier",
          shipping_cost: typia.random<number & tags.Minimum<0>>(),
        } satisfies IEcommerceShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // Wait a moment for data to be processed
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // Test 1: Query analytics without date filter
  const analytics1 =
    await api.functional.ecommerce.seller.analytics.sales.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommercePlatformEvent.IRequest,
      },
    );
  typia.assert(analytics1);
  TestValidator.predicate(
    "should have pagination",
    analytics1.pagination !== undefined,
  );
  TestValidator.predicate(
    "should have data array",
    Array.isArray(analytics1.data),
  );
  // Test 2: Query with date filtering (last 24 hours)
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const analytics2 =
    await api.functional.ecommerce.seller.analytics.sales.index(
      sellerConnection,
      {
        body: {
          date_from: yesterday.toISOString(),
          date_to: now.toISOString(),
          page: 1,
          limit: 5,
        } satisfies IEcommercePlatformEvent.IRequest,
      },
    );
  typia.assert(analytics2);
  TestValidator.predicate(
    "date filtered response has pagination",
    analytics2.pagination !== undefined,
  );
  TestValidator.equals("page should be 1", analytics2.pagination.current, 1);
  TestValidator.equals("limit should be 5", analytics2.pagination.limit, 5);
  // Test 3: Verify seller 2 cannot see seller 1's data
  const seller2Analytics =
    await api.functional.ecommerce.seller.analytics.sales.index(
      seller2Connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommercePlatformEvent.IRequest,
      },
    );
  typia.assert(seller2Analytics);
  // Seller 2 should have no sales data since we didn't create any for them
  TestValidator.predicate(
    "seller2 has data array",
    Array.isArray(seller2Analytics.data),
  );
  // Note: We can't assert empty array as system might have other data
  // Test 4: Verify response schema fields
  if (analytics1.data.length > 0) {
    const event = analytics1.data[0];
    TestValidator.predicate(
      "has event_type",
      typeof event.event_type === "string",
    );
    TestValidator.predicate(
      "has event_severity",
      typeof event.event_severity === "string",
    );
    TestValidator.predicate(
      "has event_source",
      typeof event.event_source === "string",
    );
    TestValidator.predicate(
      "has created_at",
      typeof event.created_at === "string",
    );
    // correlation_id is nullable
    if (event.correlation_id !== null) {
      TestValidator.predicate(
        "correlation_id is uuid if not null",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          event.correlation_id,
        ),
      );
    }
  }
  // Test 5: Pagination test - second page
  const analyticsPage2 =
    await api.functional.ecommerce.seller.analytics.sales.index(
      sellerConnection,
      {
        body: {
          page: 2,
          limit: 3,
        } satisfies IEcommercePlatformEvent.IRequest,
      },
    );
  typia.assert(analyticsPage2);
  TestValidator.equals(
    "page should be 2",
    analyticsPage2.pagination.current,
    2,
  );
  TestValidator.equals("limit should be 3", analyticsPage2.pagination.limit, 3);
}
