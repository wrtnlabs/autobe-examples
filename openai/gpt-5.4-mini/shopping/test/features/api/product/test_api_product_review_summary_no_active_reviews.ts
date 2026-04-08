import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Verifies the empty-state product review summary for an authenticated customer.
 *
 * This test confirms that when a product has no active reviews, the review summary endpoint still succeeds and returns the correct zero-valued aggregate response instead of failing or omitting fields.
 *
 * It also preserves the read-only nature of the endpoint by issuing only a retrieval request after customer authentication.
 *
 * 1. Register and authenticate a customer using the dedicated utility function.
 * 2. Request the review summary for a product identifier with no active reviews.
 * 3. Validate that both average rating and review count are zero.
 */
export async function test_api_product_review_summary_no_active_reviews(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const summary =
    await api.functional.mallPlatform.customer.products.reviewSummary.at(
      customerConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(summary);
  TestValidator.equals(
    "average rating should be zero",
    summary.averageRating,
    0,
  );
  TestValidator.equals("review count should be zero", summary.reviewCount, 0);
}
