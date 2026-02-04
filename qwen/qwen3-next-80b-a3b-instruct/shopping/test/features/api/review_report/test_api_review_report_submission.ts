import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReport";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_review_report_submission(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        href: "https://example.com/join",
        referrer: "https://example.com/referral",
      } satisfies IShoppingMallCustomer.IJoin,
    });
  // Create a review to report against
  const review = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        rating: 5,
        text: "This is an excellent product that exceeded my expectations.",
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review);
  // Get review ID from the response (TypeScript says it doesn't exist, but API returns an ID)
  // We use type assertion to extract it, following the API contract over DTO
  const reviewId = (review as any).id as string;
  // Create report body with all required properties from IShoppingMallReviewReport
  const reportBody: IShoppingMallReviewReport = {
    created_at: new Date().toISOString(),
    id: typia.random<string & tags.Format<"uuid">>(),
    review_id: reviewId, // The review ID from above
    reporter_id: authorized.customerId, // Extracted from authorized response
  };
  await api.functional.shoppingMall.customer.reviews.reports.create(
    customerConnection,
    {
      reviewId: reviewId,
      body: reportBody,
    },
  );
}
