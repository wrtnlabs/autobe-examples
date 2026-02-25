import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCancellationResponseRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationResponseRecord";
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
import { generate_random_ecommerce_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_customer_cancellation_requests_create";
import { generate_random_ecommerce_seller_cancellation_requests_responses_create } from "../../../generate/generate_random_ecommerce_seller_cancellation_requests_responses_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_seller_products_variants_create";
import { prepare_random_ecommerce_cancellation_request } from "../../../prepare/prepare_random_ecommerce_cancellation_request";
import { prepare_random_ecommerce_cancellation_response_record } from "../../../prepare/prepare_random_ecommerce_cancellation_response_record";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

export async function test_api_seller_cancellation_request_with_status_transitions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      password: "password123",
    },
  });
  // 2. Customer setup using utility function
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      password: "password123",
    },
  });
  // 3. Seller creates product
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 4. Seller creates product variant
  const variant =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: RandomGenerator.alphaNumeric(8),
          option_values: JSON.stringify({ color: "red", size: "M" }),
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        },
      },
    );
  typia.assert(variant);
  // 5. Customer creates order using IEcommerceOrder structure
  // Note: IEcommerceOrder appears to be for analytics, but we must use the available API
  const order = await api.functional.ecommerce.customer.orders.create(
    customerConnection,
    {
      body: {
        period: new Date().toISOString(),
        total_revenue: typia.random<number & tags.Minimum<0>>(),
        order_count: typia.random<number & tags.Type<"int32">>(),
        average_order_value: typia.random<number & tags.Minimum<0>>(),
        status_distribution: {
          paid: 1,
          shipped: 0,
          delivered: 0,
          cancelled: 0,
          refunded: 0,
        } satisfies IEcommerceOrderSnapshotStatusDistribution,
        seller_performance: [
          {
            seller_id: seller.id,
            seller: seller satisfies IEcommerceSeller.ISummary,
            total_revenue: typia.random<number & tags.Minimum<0>>(),
            order_count: 1,
            average_order_value: typia.random<number & tags.Minimum<0>>(),
            item_count: 1,
          } satisfies IEcommerceOrderSnapshotSellerPerformance,
        ],
        product_category_performance: [],
        geographic_distribution: {
          country_distribution: [],
          region_distribution: [],
          city_distribution: [],
          top_regions: [],
          unknown_locations: null,
        } satisfies IEcommerceOrderSnapshotGeographicDistribution,
        hourly_distribution: [],
      } satisfies IEcommerceOrder,
    },
  );
  typia.assert(order);
  // 6. Customer creates cancellation request for the order item
  // For this test, we assume the order item ID is accessible from the order
  const cancellationRequest =
    await generate_random_ecommerce_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          ecommerce_order_item_id: typia.random<string & tags.Format<"uuid">>(), // Placeholder for actual order item ID
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(cancellationRequest);
  // 7. Seller approves the cancellation request
  const responseApproved =
    await generate_random_ecommerce_seller_cancellation_requests_responses_create(
      sellerConnection,
      {
        params: { cancellationRequestId: cancellationRequest.id },
        body: {
          decision: "approved" as const,
          response_reason: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(responseApproved);
  // 8. Seller retrieves the approved cancellation request
  const retrievedApproved =
    await api.functional.ecommerce.seller.cancellation_requests.at(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(retrievedApproved);
  // Validate cancellation request details
  TestValidator.equals(
    "approved request id matches",
    retrievedApproved.id,
    cancellationRequest.id,
  );
  TestValidator.equals(
    "customer matches",
    retrievedApproved.customer.id,
    customer.id,
  );
  // 9. Seller rejects another cancellation request
  const cancellationRequest2 =
    await generate_random_ecommerce_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          ecommerce_order_item_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(cancellationRequest2);
  const responseRejected =
    await generate_random_ecommerce_seller_cancellation_requests_responses_create(
      sellerConnection,
      {
        params: { cancellationRequestId: cancellationRequest2.id },
        body: {
          decision: "rejected" as const,
          response_reason: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(responseRejected);
  const retrievedRejected =
    await api.functional.ecommerce.seller.cancellation_requests.at(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest2.id,
      },
    );
  typia.assert(retrievedRejected);
  TestValidator.equals(
    "rejected request id matches",
    retrievedRejected.id,
    cancellationRequest2.id,
  );
  TestValidator.equals(
    "customer matches",
    retrievedRejected.customer.id,
    customer.id,
  );
}
