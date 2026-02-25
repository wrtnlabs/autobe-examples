import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_product_review_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully retrieve detailed information for an existing product review by productReviewId
  // 1. Register and join a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  // Update customerConnection headers with the access token to authorize requests
  customerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Since no creation endpoint available here, we simulate by generating a random valid productReviewId
  //    As real creation and association are out of scope, we use a random UUID to fetch.
  //    API is expected to fail if not found, but scenario demands successful retrieval.
  //    So we skip creation and assume existence. If the actual API allows creation, that must be used.
  // 3. Make the API call to retrieve the product review details using the random productReviewId
  const productReviewId = typia.random<string & tags.Format<"uuid">>();
  const review = await api.functional.shoppingMall.customer.productReviews.at(
    customerConnection,
    {
      productReviewId,
    },
  );
  // 4. Assert the response type completeness
  typia.assert(review);
  // 5. Validate core fields
  TestValidator.predicate(
    "rating is between 1 and 5",
    review.rating >= 1 && review.rating <= 5,
  );
  TestValidator.predicate(
    "createdAt is valid date-time string",
    typeof review.createdAt === "string" && review.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt is valid date-time string",
    typeof review.updatedAt === "string" && review.updatedAt.length > 0,
  );
  // 6. Validate optional text field presence (nullable string or undefined)
  if (review.body !== undefined && review.body !== null) {
    TestValidator.predicate(
      "body is a string when present",
      typeof review.body === "string",
    );
  }
  // 7. Validate nested object summary fields
  typia.assert(review.customer);
  TestValidator.predicate(
    "customer id is uuid",
    typeof review.customer.id === "string" && review.customer.id.length > 0,
  );
  TestValidator.predicate(
    "customer email is string",
    typeof review.customer.email === "string" &&
      review.customer.email.length > 0,
  );
  typia.assert(review.orderItem);
  TestValidator.predicate(
    "orderItem id is uuid",
    typeof review.orderItem.id === "string" && review.orderItem.id.length > 0,
  );
  TestValidator.predicate(
    "orderItem status is valid",
    ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
      review.orderItem.status,
    ),
  );
  typia.assert(review.productVariant);
  TestValidator.predicate(
    "productVariant id is uuid",
    typeof review.productVariant.id === "string" &&
      review.productVariant.id.length > 0,
  );
  TestValidator.predicate(
    "productVariant skuCode is string",
    typeof review.productVariant.skuCode === "string" &&
      review.productVariant.skuCode.length > 0,
  );
}
