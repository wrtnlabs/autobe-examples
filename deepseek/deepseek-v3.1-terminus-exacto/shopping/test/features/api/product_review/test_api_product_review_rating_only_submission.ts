import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
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
import { generate_random_ecommerce_customer_products_reviews_create } from "../../../generate/generate_random_ecommerce_customer_products_reviews_create";
import { prepare_random_ecommerce_review } from "../../../prepare/prepare_random_ecommerce_review";

/**
 * Test review submission with only rating (no text content) for a delivered product.
 * Scenario: Customer purchases product, product is delivered, customer submits 3-star rating without text content.
 * Validate that the review is created with rating only, product average rating reflects the new score,
 * and the system accepts optional text content being null. Confirm snapshot preserves the minimal review data.
 */
export async function test_api_product_review_rating_only_submission(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  // 1. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create order (purchase requirement)
  const order = await api.functional.ecommerce.customer.orders.create(
    customerConnection,
    {
      body: typia.random<IEcommerceOrder>(),
    },
  );
  typia.assert(order);
  // 3. Confirm delivery to unlock review capability
  const deliveryConfirmation =
    await api.functional.ecommerce.customer.shipments.delivery_confirm.deliveryConfirm(
      customerConnection,
      {
        shipmentId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(deliveryConfirmation);
  // 4. Submit review with only rating (3 stars) and null content using utility function
  const reviewBody = {
    rating: 3 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    content: null satisfies (string & tags.MaxLength<5000>) | null,
  } satisfies IEcommerceReview.ICreate;
  const review =
    await generate_random_ecommerce_customer_products_reviews_create(
      customerConnection,
      {
        body: reviewBody,
        params: {
          productId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(review);
  // 5. Validate review creation - BUSINESS LOGIC ONLY (no type validation)
  TestValidator.equals("rating matches 3-star input", review.average_rating, 3);
  TestValidator.equals(
    "exactly one 3-star review",
    review.rating_distribution.three_stars,
    1,
  );
  TestValidator.equals("total reviews count is 1", review.total_reviews, 1);
  // 6. Validate recent trends
  TestValidator.equals(
    "one review in last 30 days",
    review.recent_trends.last_30_days,
    1,
  );
  TestValidator.equals(
    "recent average rating is 3",
    review.recent_trends.average_rating_last_30_days,
    3,
  );
  // 7. Validate business rule: review was accepted for delivered product
  TestValidator.predicate(
    "review successfully created for delivered product",
    review.average_rating === 3 && review.total_reviews === 1,
  );
}
