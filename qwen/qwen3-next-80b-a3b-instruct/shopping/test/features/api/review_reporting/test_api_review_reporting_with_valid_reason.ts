import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReport";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_review_reporting_with_valid_reason(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authorize an admin user
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com",
      referrer: "https://example.com/referral",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Create a new connection and authorize a customer user
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com",
      referrer: "https://example.com/referral",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // Step 3: Create an order via customer connection
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Step 4: Create a review via customer connection
  const review = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        rating: 5,
        text: "This is an excellent product with outstanding quality. The customer service was also exceptional.",
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review);
  // Step 5: Use admin connection to report the review with a policy-compliant reason
  const reportReason =
    "This review contains false information about the product quality, claiming superior performance that contradicts verified customer experiences and objective product testing results. The review is misleading and violates platform policy against deceptive content.";
  // Ensure reason is between 5 and 500 characters
  TestValidator.predicate(
    "reason length within bounds",
    reportReason.length >= 5 && reportReason.length <= 500,
  );
  // The review object returned from API has an id property, but IShoppingMallReview is defined as empty
  // This is a documented API pattern where all entities have an id field
  // We'll use typia.assert to assert the review has an id property as per system patterns
  const reviewWithId: IShoppingMallReview & {
    id: string;
  } = typia.assert<
    IShoppingMallReview & {
      id: string;
    }
  >(review);
  const reviewId = reviewWithId.id;
  const reportResult = await api.functional.shoppingMall.admin.reviews.report(
    adminConnection,
    {
      body: {
        review_id: reviewId,
        reason: reportReason,
      } satisfies IShoppingMallReviewReport.IRequest,
    },
  );
  // Validate successful reporting response
  typia.assert(reportResult);
  TestValidator.equals("reporting was successful", reportResult.success, true);
}
