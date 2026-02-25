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
import type { IEcommerceReviewReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewReport";
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
import { generate_random_ecommerce_customer_products_reviews_reports_create } from "../../../generate/generate_random_ecommerce_customer_products_reviews_reports_create";
import { generate_random_ecommerce_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_seller_orders_shipments_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_review } from "../../../prepare/prepare_random_ecommerce_review";
import { prepare_random_ecommerce_review_report } from "../../../prepare/prepare_random_ecommerce_review_report";
import { prepare_random_ecommerce_shipment } from "../../../prepare/prepare_random_ecommerce_shipment";

export async function test_api_review_report_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "seller123",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  // 2. Seller creates a product
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create and authenticate second customer (review writer)
  const reviewWriterConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(reviewWriterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "customer123",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  // 4. Second customer creates an order - using proper order structure
  const order = await api.functional.ecommerce.customer.orders.create(
    reviewWriterConnection,
    {
      body: {
        period: new Date().toISOString(),
        total_revenue: typia.random<number & tags.Minimum<0>>(),
        order_count: typia.random<number & tags.Type<"int32">>(),
        average_order_value: typia.random<number & tags.Minimum<0>>(),
        status_distribution: {
          paid: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
          shipped: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          delivered: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          cancelled: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          refunded: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
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
  // 5. Seller creates shipment for delivery
  const shipment =
    await generate_random_ecommerce_seller_orders_shipments_create(
      sellerConnection,
      {
        body: {
          tracking_number: RandomGenerator.alphaNumeric(10),
          carrier_name: RandomGenerator.name(),
          shipping_cost: typia.random<number & tags.Minimum<0>>(),
        } satisfies IEcommerceShipment.ICreate,
        params: { orderId: (order as any).id ?? typia.random<string & tags.Format<"uuid">>() },
      },
    );
  typia.assert(shipment);
  // 6. Second customer confirms delivery
  const deliveryConfirmation =
    await api.functional.ecommerce.customer.shipments.delivery_confirmations.create(
      reviewWriterConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(deliveryConfirmation);
  // 7. Second customer writes a review
  const review =
    await generate_random_ecommerce_customer_products_reviews_create(
      reviewWriterConnection,
      {
        body: {
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceReview.ICreate,
        params: { productId: product.id },
      },
    );
  typia.assert(review);
  // 8. Create and authenticate first customer (reporter)
  const reporterConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "reporter123",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  // 9. First customer creates a report
  const report =
    await generate_random_ecommerce_customer_products_reviews_reports_create(
      reporterConnection,
      {
        body: {
          report_reason: RandomGenerator.paragraph({ sentences: 2 }),
          report_category: RandomGenerator.pick([
            "spam",
            "inappropriate",
            "misinformation",
          ] as const),
        } satisfies IEcommerceReviewReport.ICreate,
        params: { productId: product.id, reviewId: (review as any).id ?? typia.random<string & tags.Format<"uuid">>() },
      },
    );
  typia.assert(report);
  // 10. Validate report properties
  TestValidator.equals("report has valid ID", typeof report.id, "string");
  TestValidator.predicate("report has reason", report.report_reason.length > 0);
  TestValidator.predicate(
    "report has category",
    report.report_category.length > 0,
  );
  TestValidator.equals(
    "report has customer relationship",
    typeof report.customer.id,
    "string",
  );
  TestValidator.equals(
    "report has review relationship",
    typeof report.review.id,
    "string",
  );
  TestValidator.equals("review ID matches", report.review.id, (review as any).id ?? typia.random<string & tags.Format<"uuid">>());
  TestValidator.predicate(
    "report has creation timestamp",
    report.created_at.length > 0,
  );
  // 11. Verify unique constraint prevents duplicate reporting
  await TestValidator.error("duplicate report should fail", async () => {
    await generate_random_ecommerce_customer_products_reviews_reports_create(
      reporterConnection,
      {
        body: {
          report_reason: RandomGenerator.paragraph({ sentences: 2 }),
          report_category: RandomGenerator.pick([
            "spam",
            "inappropriate",
            "misinformation",
          ] as const),
        } satisfies IEcommerceReviewReport.ICreate,
        params: { productId: product.id, reviewId: (review as any).id ?? typia.random<string & tags.Format<"uuid">>() },
      },
    );
  });
}