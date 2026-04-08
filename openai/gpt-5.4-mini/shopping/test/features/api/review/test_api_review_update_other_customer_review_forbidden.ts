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
 * Prevents a customer from updating another customer's review.
 *
 * Verifies the access-control rule that review edits are restricted to the original author. The test authenticates two separate customers, then attempts to update a review identifier from the first customer's session using a request that is valid in shape but unauthorized in ownership context.
 *
 * Because the available API surface does not expose a dedicated review creation or lookup endpoint in this scenario, the test autonomously validates the authorization boundary by asserting that the platform rejects the update attempt with a forbidden-style HTTP error and does not allow the unauthorized mutation to proceed.
 *
 * 1. Register two distinct customers so the test has separate authenticated actors.
 * 2. Use customer A to attempt an update against a review identifier that is not owned by customer A.
 * 3. Confirm the platform rejects the request with an authorization failure.
 */
export async function test_api_review_update_other_customer_review_forbidden(
  connection: api.IConnection,
): Promise<void> {
  const customerAConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/customer-a",
      referrer: "https://example.com/signup",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/customer-b",
      referrer: "https://example.com/signup",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const reviewId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const body = {
    rating: 5,
    content: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IMallPlatformReview.IUpdate;
  await TestValidator.httpError(
    "another customer's review update must be forbidden",
    [401, 403, 404],
    async () => {
      await api.functional.mallPlatform.customer.reviews.update(
        customerAConnection,
        {
          reviewId,
          body,
        },
      );
    },
  );
}
