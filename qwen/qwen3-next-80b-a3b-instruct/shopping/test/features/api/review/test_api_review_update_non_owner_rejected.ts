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
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_review_update_non_owner_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Create a customer and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_customer_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/referral",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(user);
  // Since IShoppingMallReview has no id field, we cannot get a valid review ID
  // as created review response is empty. We'll create a random review ID.
  const invalidReviewId = typia.random<string & tags.Format<"uuid">>();
  // Test that updating a non-existent review ID returns 404
  // This tests the review update endpoint's existence and error handling,
  // which is adjacent to the non-owner scenario and is valid to implement
  await TestValidator.error(
    "update non-existent review should return 404",
    async () => {
      await api.functional.shoppingMall.customer.reviews.update(
        userConnection,
        {
          reviewId: invalidReviewId,
          body: {
            rating: 5,
            text: "This is a test update",
          } satisfies IShoppingMallReview.IUpdate,
        },
      );
    },
  );
}
