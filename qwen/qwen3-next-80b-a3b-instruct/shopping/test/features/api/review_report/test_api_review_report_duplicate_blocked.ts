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
export async function test_api_review_report_duplicate_blocked(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = typia.assert<IShoppingMallCustomer.IAuthorized>(
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/referral",
      } satisfies IShoppingMallCustomer.IJoin,
    }),
  );
  // Step 2: Create a review
  const review = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        rating: 5,
        text: "Excellent product! Highly recommend.",
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  // Validate the review has a server-generated id
  const reviewWithId = typia.assert<
    IShoppingMallReview & {
      id: string;
    }
  >(review);
  // Step 3: Submit first report with complete required fields
  await api.functional.shoppingMall.customer.reviews.reports.create(
    customerConnection,
    {
      reviewId: reviewWithId.id,
      body: {
        created_at: new Date().toISOString(),
        id: typia.random<string & tags.Format<"uuid">>(),
        review_id: reviewWithId.id,
        reporter_id: customer.customerId,
      } satisfies IShoppingMallReviewReport,
    },
  );
  // Step 4: Attempt duplicate report - should return 403 Forbidden
  await TestValidator.error(
    "duplicate review report should return 403 Forbidden",
    async () => {
      await api.functional.shoppingMall.customer.reviews.reports.create(
        customerConnection,
        {
          reviewId: reviewWithId.id,
          body: {
            created_at: new Date().toISOString(),
            id: typia.random<string & tags.Format<"uuid">>(),
            review_id: reviewWithId.id,
            reporter_id: customer.customerId,
          } satisfies IShoppingMallReviewReport,
        },
      );
    },
  );
}
