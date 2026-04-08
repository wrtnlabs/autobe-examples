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

/**
 * Test customer review creation is rejected before delivery.
 *
 * Verifies that an authenticated customer cannot create a review when the
 * purchase context has not reached delivered status. This covers the core
 * business rule that reviews are only allowed after delivery and ensures the
 * review endpoint enforces the delivery prerequisite.
 *
 * 1. Register a customer account and authenticate the caller.
 * 2. Attempt to create a review without any delivered purchase context.
 * 3. Confirm the endpoint rejects the request, preserving the no-review-before-
 *    delivery rule.
 */
export async function test_api_customer_review_create_before_delivery(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  await TestValidator.error(
    "review creation before delivery should be rejected",
    async () => {
      await api.functional.mallPlatform.customer.reviews.create(
        customerConnection,
        {
          body: {
            rating: 5,
            content: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IMallPlatformReview.ICreate,
        },
      );
    },
  );
}
