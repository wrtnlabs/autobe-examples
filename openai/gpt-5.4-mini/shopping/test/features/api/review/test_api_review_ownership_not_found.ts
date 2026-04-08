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

/**
 * Verify not-found behavior for review ownership lookup when the review does not exist.
 *
 * This test covers the read-only ownership endpoint for a missing review resource.
 * It authenticates a customer account, then requests ownership information for a UUID that is not present in the system, and confirms the server responds with a not-found error without mutating any review-related data.
 *
 * 1. Create and authenticate a customer account using the registration utility.
 * 2. Call the review ownership endpoint with a fixed UUID that does not correspond to any stored review.
 * 3. Assert the request fails with an HTTP not-found error.
 */
export async function test_api_review_ownership_not_found(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  await TestValidator.httpError(
    "review ownership should return not found for missing review",
    404,
    async () => {
      await api.functional.mallPlatform.customer.reviews.ownership.at(
        customerConnection,
        {
          reviewId: "00000000-0000-0000-0000-000000000000",
        },
      );
    },
  );
}
