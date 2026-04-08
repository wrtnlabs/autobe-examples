import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_join_minimal_fields(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the customer
  const customerConnection: api.IConnection = { host: connection.host };
  // Register with minimal fields (omitting optional ip field)
  const response = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      // ip field intentionally omitted to test server-side detection
    },
  });
  // Validate response structure - validates complete IEcommerceMallCustomer.IAuthorized
  typia.assert(response);
  // Verify that Authorization header was automatically set on connection by the join function
  TestValidator.equals(
    "Authorization header matches access token",
    customerConnection.headers?.Authorization,
    response.token.access,
  );
  // Verify timestamps indicate valid future tokens (business logic validation)
  const now = Date.now();
  const expiredAt = new Date(response.token.expired_at).getTime();
  const refreshableUntil = new Date(response.token.refreshable_until).getTime();
  TestValidator.predicate("access token expires in future", expiredAt > now);
  TestValidator.predicate(
    "refresh token expires in future",
    refreshableUntil > now,
  );
}
