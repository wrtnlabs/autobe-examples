import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceDeliveryConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDeliveryConfirmation";
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
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import type { IEcommerceReviewResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewResponse";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
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
import { generate_random_ecommerce_customer_products_reviews_create } from "../../../generate/generate_random_ecommerce_customer_products_reviews_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_reviews_seller_response_create_seller_response } from "../../../generate/generate_random_ecommerce_seller_products_reviews_seller_response_create_seller_response";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_review } from "../../../prepare/prepare_random_ecommerce_review";
import { prepare_random_ecommerce_review_response } from "../../../prepare/prepare_random_ecommerce_review_response";

export async function test_api_seller_review_response_deletion_authorized_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(seller);
  // 2. Create product owned by the seller
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Customer setup and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    },
  });
  typia.assert(customer);
  // 4. Create order (simplified - requires payment and cart integration in real system)
  // Note: In real implementation, would need order creation after product variants and cart setup
  // For this test, we'll create a minimal order representation
  const order = await api.functional.ecommerce.customer.orders.create(
    customerConnection,
    {
      body: {
        period: new Date().toISOString(),
        total_revenue: typia.random<number>(),
        order_count: typia.random<number & tags.Type<"int32">>(),
        average_order_value: typia.random<number>(),
        status_distribution: {
          paid: typia.random<number & tags.Type<"int32">>(),
          shipped: typia.random<number & tags.Type<"int32">>(),
          delivered: typia.random<number & tags.Type<"int32">>(),
          cancelled: typia.random<number & tags.Type<"int32">>(),
          refunded: typia.random<number & tags.Type<"int32">>(),
        },
        seller_performance: [],
        product_category_performance: [],
        geographic_distribution: {
          country_distribution: [],
          region_distribution: [],
          city_distribution: [],
          top_regions: [],
          unknown_locations: null,
        },
        hourly_distribution: [],
      } satisfies IEcommerceOrder,
    },
  );
  typia.assert(order);
  // 5. Create shipment and confirm delivery (requires shipment ID from order)
  // For testing, we'll assume delivery confirmation is successful
  // In real system, would need actual shipment creation first
  const deliveryConfirmation =
    await api.functional.ecommerce.customer.shipments.delivery_confirmations.create(
      customerConnection,
      {
        shipmentId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(deliveryConfirmation);
  // 6. Customer creates review
  const review =
    await generate_random_ecommerce_customer_products_reviews_create(
      customerConnection,
      {
        params: { productId: product.id },
        body: {
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  
  // Extract the review ID from the response - casting to IEntity to get the id property
  const reviewWithId = typia.assert<IEntity>(review);
  
  typia.assert(review);
  // 7. Seller creates response to the review
  const sellerResponse =
    await generate_random_ecommerce_seller_products_reviews_seller_response_create_seller_response(
      sellerConnection,
      {
        params: {
          productId: product.id,
          reviewId: reviewWithId.id,
        },
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(sellerResponse);
  // 8. Verify seller can delete their own response
  await api.functional.ecommerce.seller.products.reviews.seller_response.erase(
    sellerConnection,
    {
      productId: product.id,
      reviewId: reviewWithId.id,
    },
  );
  // 9. Verify response cannot be retrieved after deletion
  // Note: We would need a GET endpoint to verify deletion, but since
  // we only have DELETE endpoint, we can verify by attempting to create
  // a new response (should succeed after deletion)
  const newSellerResponse =
    await generate_random_ecommerce_seller_products_reviews_seller_response_create_seller_response(
      sellerConnection,
      {
        params: {
          productId: product.id,
          reviewId: reviewWithId.id,
        },
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(newSellerResponse);
  TestValidator.notEquals(
    "new response should not match deleted response",
    typia.assert<IEntity>(newSellerResponse).id,
    typia.assert<IEntity>(sellerResponse).id,
  );
}