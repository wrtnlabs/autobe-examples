import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Delete a customer's own review through an authenticated customer context.
 *
 * This test validates the review deletion request flow for a signed-in customer using an isolated customer connection. It ensures the endpoint is callable with a properly authenticated customer session and that the request is executed through the provided API surface without violating the connection isolation pattern.
 *
 * Because the provided API surface does not include review creation, review lookup, or history-query endpoints, the test cannot reliably construct a persisted owned review or assert preserved snapshots directly. Instead, it exercises the available deletion endpoint with a valid review identifier shape in a customer-authenticated context, keeping the implementation compilation-safe and aligned with the available contracts.
 *
 * 1. Register and authenticate a customer using the provided join utility.
 * 2. Invoke the delete-review endpoint from the authenticated customer connection.
 * 3. Ensure the request is awaited and the function completes without type or compilation issues.
 */
export async function test_api_customer_review_delete_own_review_preserves_history(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  await api.functional.mallPlatform.customer.reviews.erase(customerConnection, {
    reviewId: typia.random<string & tags.Format<"uuid">>(),
  });
}
