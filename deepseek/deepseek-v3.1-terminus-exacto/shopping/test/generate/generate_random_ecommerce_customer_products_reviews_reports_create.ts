import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import type { IEcommerceReviewReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_review_report } from "../prepare/prepare_random_ecommerce_review_report";

/**
 * Generates a random ecommerce review report for testing purposes.
 *
 * This function creates a review report by first generating test data using the
 * prepare function, then calling the API endpoint to create the actual resource.
 * The function requires productId and reviewId as URL parameters to associate
 * the report with the specific product review.
 *
 * @param connection - API connection object for making HTTP requests
 * @param props - Configuration options including body data and URL parameters
 * @returns The created review report with complete details
 */
export async function generate_random_ecommerce_customer_products_reviews_reports_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceReviewReport.ICreate>;
    params: {
      productId: string;
      reviewId: string;
    };
  },
): Promise<IEcommerceReviewReport> {
  const prepared: IEcommerceReviewReport.ICreate =
    prepare_random_ecommerce_review_report(props.body);
  const result: IEcommerceReviewReport =
    await api.functional.ecommerce.customer.products.reviews.reports.create(
      connection,
      {
        productId: props.params.productId,
        reviewId: props.params.reviewId,
        body: prepared,
      },
    );
  return result;
}
