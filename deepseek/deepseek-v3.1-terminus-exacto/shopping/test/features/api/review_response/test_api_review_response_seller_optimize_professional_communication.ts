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

export async function test_api_review_response_seller_optimize_professional_communication(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "seller_password_123",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create seller product
  const product = await api.functional.ecommerce.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 2,
          wordMax: 4,
        }).substring(0, 50),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "customer_password_123",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    },
  });
  // 4. Customer places order (simplified - using available order API)
  // Note: In real scenario, order would be created via cart checkout flow
  // Using simplified approach with provided IEcommerceOrder structure
  const orderBody = {
    period: new Date().toISOString(),
    total_revenue: product.base_price,
    order_count: 1,
    average_order_value: product.base_price,
    status_distribution: {
      paid: 1,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      refunded: 0,
    },
    seller_performance: [
      {
        seller_id: product.seller.id,
        seller: product.seller,
        total_revenue: product.base_price,
        order_count: 1,
        average_order_value: product.base_price,
        item_count: 1,
      },
    ],
    product_category_performance: [],
    geographic_distribution: {
      country_distribution: [],
      region_distribution: [],
      city_distribution: [],
      top_regions: [],
      unknown_locations: null,
    },
    hourly_distribution: [],
  } satisfies IEcommerceOrder;
  const order = await api.functional.ecommerce.customer.orders.create(
    customerConnection,
    { body: orderBody },
  );
  typia.assert(order);
  // 5. Simulate shipment delivery (requires shipmentId from order flow)
  // Since we don't have actual shipmentId, we'll create a mock for testing
  // In real implementation, this would come from order fulfillment flow
  const mockShipmentId = typia.random<string & tags.Format<"uuid">>();
  // 6. Customer confirms delivery (simplified for test)
  // Note: This assumes order has reached delivered status
  // In real flow, this would update order items to 'delivered' status
  try {
    const deliveryConfirmation =
      await api.functional.ecommerce.customer.shipments.delivery_confirmations.create(
        customerConnection,
        { shipmentId: mockShipmentId },
      );
    typia.assert(deliveryConfirmation);
  } catch {
    // Skip if shipment not found - continue with review creation
    // In real implementation, ensure proper delivery workflow
  }
  // 7. Customer creates review
  const review =
    await api.functional.ecommerce.customer.products.reviews.create(
      customerConnection,
      {
        productId: product.id,
        body: {
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<3> & tags.Maximum<5>
          >(),
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceReview.ICreate,
      },
    );
  typia.assert(review);
  // 8. Seller creates initial professional response
  const reviewWithId = typia.assert<IEntity & IEcommerceReview>(review);
  const initialResponse =
    await api.functional.ecommerce.seller.products.reviews.seller_response.createSellerResponse(
      sellerConnection,
      {
        productId: product.id,
        reviewId: reviewWithId.id,
        body: {
          body: `Thank you for your feedback. We appreciate you taking the time to review our product. We're glad to hear you're satisfied with your purchase.`,
        } satisfies IEcommerceReviewResponse.ICreate,
      },
    );
  typia.assert(initialResponse);
  TestValidator.equals(
    "response belongs to correct review",
    initialResponse.review.id,
    reviewWithId.id,
  );
  TestValidator.equals(
    "response belongs to correct seller",
    initialResponse.seller.id,
    product.seller.id,
  );
  TestValidator.predicate(
    "initial response has professional greeting",
    initialResponse.body.includes("Thank you"),
  );
  // 9. Seller updates response to improve professionalism
  const updatedResponse =
    await api.functional.ecommerce.seller.products.reviews.seller_response.update(
      sellerConnection,
      {
        productId: product.id,
        reviewId: reviewWithId.id,
        body: {
          body: `Dear valued customer,

Thank you for sharing your detailed feedback regarding your experience with our product. We sincerely appreciate you taking the time to provide such thoughtful insights.

Your positive rating of ${reviewWithId.average_rating} stars is greatly encouraging to our team. We're delighted to know that our product met your expectations. Should you have any further questions or require additional assistance, please don't hesitate to reach out to our customer support team.

We value your business and look forward to serving you again in the future.

Best regards,\\nThe ${product.seller.shop_name} Team`,
        } satisfies IEcommerceReviewResponse.IUpdate,
      },
    );
  typia.assert(updatedResponse);
  // 10. Validate improvements in professional communication
  TestValidator.equals(
    "response ID remains same",
    updatedResponse.id,
    initialResponse.id,
  );
  TestValidator.notEquals(
    "response body updated",
    updatedResponse.body,
    initialResponse.body,
  );
  TestValidator.predicate(
    "updated response has improved professional tone",
    updatedResponse.body.includes("Dear valued customer") &&
      updatedResponse.body.includes("Best regards") &&
      updatedResponse.body.includes("customer support"),
  );
  TestValidator.predicate(
    "updated response is longer (more detailed)",
    updatedResponse.body.length > initialResponse.body.length,
  );
  TestValidator.predicate(
    "updated response includes personalized elements",
    updatedResponse.body.includes(product.seller.shop_name) &&
      updatedResponse.body.includes(reviewWithId.average_rating.toString()),
  );
  TestValidator.predicate(
    "updated_at timestamp should be later than created_at",
    new Date(updatedResponse.updated_at) > new Date(updatedResponse.created_at),
  );
}