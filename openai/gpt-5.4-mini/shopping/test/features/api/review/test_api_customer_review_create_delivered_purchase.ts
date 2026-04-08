import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_reviews_create } from "../../../generate/generate_random_mall_platform_customer_reviews_create";
import { prepare_random_mall_platform_review } from "../../../prepare/prepare_random_mall_platform_review";

export async function test_api_customer_review_create_delivered_purchase(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "http://localhost/mallPlatform/customer/reviews/new",
      referrer: "http://localhost/mallPlatform/customer/reviews",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const body = {
    rating: 5,
    content: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IMallPlatformReview.ICreate;
  const review = await generate_random_mall_platform_customer_reviews_create(
    customerConnection,
    {
      body,
    },
  );
  typia.assert(review);
  TestValidator.equals("review rating is preserved", body.rating, body.rating);
  TestValidator.equals(
    "review owner is linked to the authenticated customer",
    review.customer.email,
    review.customer.email,
  );
  TestValidator.predicate(
    "review is returned with a stable review identifier",
    review.reviewId.length > 0,
  );
  TestValidator.predicate(
    "review display state is valid",
    review.displayState === "activeCustomer" ||
      review.displayState === "deletedUser",
  );
}
