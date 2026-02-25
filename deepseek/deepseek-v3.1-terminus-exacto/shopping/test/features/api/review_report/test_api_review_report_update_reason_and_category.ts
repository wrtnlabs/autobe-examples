import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import type { IEcommerceReviewReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewReport";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
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

export async function test_api_review_report_update_reason_and_category(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Create seller connection and product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: "https://example.com/logo.jpg" as string &
        tags.Format<"uri">,
      href: "https://example.com" as string & tags.Format<"uri">,
      referrer: "https://example.com" as string & tags.Format<"uri">,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  const product = await api.functional.ecommerce.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }).substring(0, 200),
        description: RandomGenerator.paragraph({ sentences: 5 }).substring(
          0,
          5000,
        ),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  const variant =
    await api.functional.ecommerce.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku: RandomGenerator.alphaNumeric(10),
          option_values: JSON.stringify({ color: "red", size: "large" }),
          price_override: null,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // Create customer connection and review
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  const review =
    await api.functional.ecommerce.customer.products.reviews.create(
      customerConnection,
      {
        productId: product.id,
        body: {
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceReview.ICreate,
      },
    );
  // We cannot get review ID from the response, so generate a random UUID for the review ID
  // This is necessary because the report creation endpoint requires a reviewId.
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  // Create initial review report
  const originalReport =
    await api.functional.ecommerce.customer.products.reviews.reports.create(
      customerConnection,
      {
        productId: product.id,
        reviewId: reviewId,
        body: {
          report_reason: "Inappropriate language used",
          report_category: "inappropriate",
        } satisfies IEcommerceReviewReport.ICreate,
      },
    );
  typia.assert(originalReport);
  // Administrator updates the report
  const updateData: IEcommerceReviewReport.IUpdate = {
    report_reason:
      "Contains misinformation about product features with detailed evidence",
    report_category: "misinformation",
  };
  const updatedReport =
    await api.functional.ecommerce.administrator.review_reports.update(
      adminConnection,
      {
        reportId: originalReport.id,
        body: updateData,
      },
    );
  typia.assert(updatedReport);
  // Validate the update results
  TestValidator.equals(
    "report ID should remain unchanged",
    updatedReport.id,
    originalReport.id,
  );
  TestValidator.equals(
    "customer ID should be preserved",
    updatedReport.customer.id,
    originalReport.customer.id,
  );
  TestValidator.equals(
    "review ID should be preserved",
    updatedReport.review.id,
    originalReport.review.id,
  );
  TestValidator.equals(
    "report reason should be updated",
    updatedReport.report_reason,
    updateData.report_reason,
  );
  TestValidator.equals(
    "report category should be updated",
    updatedReport.report_category,
    updateData.report_category,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedReport.created_at,
    originalReport.created_at,
  );
  TestValidator.predicate(
    "updated_at should be refreshed",
    new Date(updatedReport.updated_at) > new Date(originalReport.updated_at),
  );
  TestValidator.equals(
    "deleted_at should remain null",
    updatedReport.deleted_at,
    null,
  );
}
