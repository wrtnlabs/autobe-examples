import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Verifies that a customer profile lookup fails when the authenticated account has no profile record.
 *
 * This test exercises the customer authentication flow and then calls the customer profile endpoint
 * under that signed-in session. It validates the business-rule behavior for the missing-profile case,
 * ensuring the endpoint reports profile unavailability as a not-found style error instead of creating
 * a replacement profile or returning unrelated customer data.
 *
 * 1. Register and authenticate a customer session.
 * 2. Call the customer profile endpoint with the authenticated customer connection.
 * 3. Assert the endpoint reports a not-found style business error for an absent profile record.
 */
export async function test_api_customer_profile_missing_profile_not_found(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  TestValidator.predicate("customer session should be issued", () => {
    return (
      customer.token.access.length > 0 && customer.token.refresh.length > 0
    );
  });
  await TestValidator.httpError(
    "missing customer profile should return a not-found style error",
    [404],
    async () => {
      await api.functional.mallPlatform.customer.profile.at(customerConnection);
    },
  );
}
