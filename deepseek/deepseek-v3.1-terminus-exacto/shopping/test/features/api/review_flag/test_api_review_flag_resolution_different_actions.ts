import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
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
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import type { IEcommerceReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewFlag";
import type { IEcommerceReviewReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewReport";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_customer_products_reviews_create } from "../../../generate/generate_random_ecommerce_customer_products_reviews_create";
import { generate_random_ecommerce_customer_products_reviews_reports_create } from "../../../generate/generate_random_ecommerce_customer_products_reviews_reports_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_seller_products_variants_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";
import { prepare_random_ecommerce_review } from "../../../prepare/prepare_random_ecommerce_review";
import { prepare_random_ecommerce_review_report } from "../../../prepare/prepare_random_ecommerce_review_report";

export async function test_api_review_flag_resolution_different_actions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // 2. Create seller account and product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "seller1234",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: RandomGenerator.alphaNumeric(8),
          option_values: JSON.stringify({ color: "red", size: "M" }),
          price_override: null,
          quantity: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 3. Create customer accounts
  const customer1Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "customer1234",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  const customer2Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "customer1234",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  // 4. Test different resolution actions
  const resolutionActions = [
    "no_action",
    "review_removed",
    "warning_issued",
  ] as const;
  for (const action of resolutionActions) {
    // Create a new review for each action test to avoid uniqueness constraints
    const review =
      await generate_random_ecommerce_customer_products_reviews_create(
        customer1Connection,
        {
          params: { productId: product.id },
          body: {
            rating: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
            >(),
            content: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IEcommerceReview.ICreate,
        },
      );
    typia.assert(review);
    // Type assert the review to have an id property
    const reviewWithId = review as IEcommerceReview & Pick<IEntity, 'id'>;
    // Customer2 reports the review (creates flag)
    const report =
      await generate_random_ecommerce_customer_products_reviews_reports_create(
        customer2Connection,
        {
          params: { productId: product.id, reviewId: reviewWithId.id },
          body: {
            report_reason: `Test report for ${action} action`,
            report_category: "inappropriate",
          } satisfies IEcommerceReviewReport.ICreate,
        },
      );
    typia.assert(report);
    // Administrator assigns the flag to themselves
    const assignedFlag =
      await api.functional.ecommerce.administrator.review_flags.assign(
        adminConnection,
        {
          flagId: report.id,
          body: {} satisfies IEcommerceReviewFlag.IAssign,
        },
      );
    typia.assert(assignedFlag);
    // Resolve with specific action and valid resolution details
    const resolvedFlag =
      await api.functional.ecommerce.administrator.review_flags.resolve(
        adminConnection,
        {
          flagId: report.id,
          body: {
            resolution_action: action,
            resolution_details: RandomGenerator.paragraph({ sentences: 3 }),
            status: "resolved",
          } satisfies IEcommerceReviewFlag.IUpdate,
        },
      );
    typia.assert(resolvedFlag);
    // Validate resolution action and details
    TestValidator.equals(
      `resolution action should be ${action}`,
      resolvedFlag.resolution_action,
      action,
    );
    TestValidator.predicate(
      `resolution details should exist for ${action}`,
      resolvedFlag.resolution_details !== null &&
        resolvedFlag.resolution_details !== undefined &&
        resolvedFlag.resolution_details.length > 0,
    );
    TestValidator.predicate(
      `resolved at timestamp should exist for ${action}`,
      resolvedFlag.resolved_at !== null &&
        resolvedFlag.resolved_at !== undefined,
    );
    TestValidator.equals(
      `status should be resolved for ${action}`,
      resolvedFlag.status,
      "resolved",
    );
    TestValidator.predicate(
      `administrator should be assigned for ${action}`,
      resolvedFlag.administrator !== null &&
        resolvedFlag.administrator !== undefined,
    );
  }
  // 5. Test business logic - valid resolution details with minimum content
  const testReview =
    await generate_random_ecommerce_customer_products_reviews_create(
      customer1Connection,
      {
        params: { productId: product.id },
        body: {
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceReview.ICreate,
      },
    );
  typia.assert(testReview);
  const testReviewWithId = testReview as IEcommerceReview & Pick<IEntity, 'id'>;
  const testReport =
    await generate_random_ecommerce_customer_products_reviews_reports_create(
      customer2Connection,
      {
        params: { productId: product.id, reviewId: testReviewWithId.id },
        body: {
          report_reason: "Test minimum length requirement",
          report_category: "spam",
        } satisfies IEcommerceReviewReport.ICreate,
      },
    );
  typia.assert(testReport);
  const testAssignedFlag =
    await api.functional.ecommerce.administrator.review_flags.assign(
      adminConnection,
      {
        flagId: testReport.id,
        body: {} satisfies IEcommerceReviewFlag.IAssign,
      },
    );
  typia.assert(testAssignedFlag);
  // Test with valid resolution details that meet minimum requirements
  const validResolvedFlag =
    await api.functional.ecommerce.administrator.review_flags.resolve(
      adminConnection,
      {
        flagId: testReport.id,
        body: {
          resolution_action: "no_action",
          resolution_details:
            "Valid resolution details that meet minimum length requirements",
          status: "resolved",
        } satisfies IEcommerceReviewFlag.IUpdate,
      },
    );
  typia.assert(validResolvedFlag);
  TestValidator.equals(
    "valid resolution details should be accepted",
    validResolvedFlag.resolution_details,
    "Valid resolution details that meet minimum length requirements",
  );
}