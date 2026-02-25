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

type IReviewWithId = IEcommerceReview & IEntity;

export async function test_api_review_flag_resolution_successful_action(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
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
  // Create product
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 2,
          wordMax: 4,
        }).substring(0, 50),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<number & tags.Minimum<1000>>(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // Create product variant
  const variant =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: RandomGenerator.alphaNumeric(8),
          option_values: JSON.stringify({ size: "M", color: "blue" }),
          price_override: null,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // Create customer account (review writer)
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "customer1234",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  // Create checkout and purchase product (simplified for test)
  const order = await api.functional.ecommerce.customer.checkout.create(
    customerConnection,
    {
      body: {
        customer_id: customerAuth.id,
        created_after: new Date(Date.now() - 86400000).toISOString(),
      } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(order);
  // Simulate delivery confirmation (using a valid shipment ID from order)
  const deliveryConfirmation =
    await api.functional.ecommerce.customer.shipments.delivery_confirm.deliveryConfirm(
      customerConnection,
      {
        shipmentId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(deliveryConfirmation);
  // Customer writes review
  const review =
    await generate_random_ecommerce_customer_products_reviews_create(
      customerConnection,
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
  typia.assert<IReviewWithId>(review);
  const reviewWithId = review as IReviewWithId;
  // Create another customer account (reporter)
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth = await authorize_customer_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "reporter1234",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  // Reporter creates review report
  const report =
    await generate_random_ecommerce_customer_products_reviews_reports_create(
      reporterConnection,
      {
        params: { productId: product.id, reviewId: reviewWithId.id },
        body: {
          report_reason: RandomGenerator.paragraph({ sentences: 1 }),
          report_category: "inappropriate",
        } satisfies IEcommerceReviewReport.ICreate,
      },
    );
  typia.assert(report);
  // Administrator assigns the flag (using report ID as flag ID for this test)
  const assignedFlag =
    await api.functional.ecommerce.administrator.review_flags.assign(
      adminConnection,
      {
        flagId: report.id,
        body: {} satisfies IEcommerceReviewFlag.IAssign,
      },
    );
  typia.assert(assignedFlag);
  // Administrator resolves the flag
  const resolvedFlag =
    await api.functional.ecommerce.administrator.review_flags.resolve(
      adminConnection,
      {
        flagId: assignedFlag.id,
        body: {
          resolution_action: "review_removed",
          resolution_details: "Review violated platform guidelines",
          status: "resolved",
        } satisfies IEcommerceReviewFlag.IUpdate,
      },
    );
  typia.assert(resolvedFlag);
  // Validate flag resolution
  TestValidator.equals(
    "flag status should be resolved",
    resolvedFlag.status,
    "resolved",
  );
  TestValidator.equals(
    "resolution action should be recorded",
    resolvedFlag.resolution_action,
    "review_removed",
  );
  TestValidator.equals(
    "resolution details should be recorded",
    resolvedFlag.resolution_details,
    "Review violated platform guidelines",
  );
  TestValidator.predicate(
    "resolved_at timestamp should be set",
    resolvedFlag.resolved_at !== null,
  );
  TestValidator.predicate(
    "updated_at timestamp should be newer than created_at",
    new Date(resolvedFlag.updated_at) > new Date(resolvedFlag.created_at),
  );
  TestValidator.equals(
    "customer relationship should be maintained",
    resolvedFlag.customer.id,
    reporterAuth.id,
  );
  TestValidator.equals(
    "review relationship should be maintained",
    resolvedFlag.review.id,
    reviewWithId.id,
  );
  TestValidator.equals(
    "administrator relationship should be maintained",
    resolvedFlag.administrator?.id,
    adminAuth.id,
  );
}