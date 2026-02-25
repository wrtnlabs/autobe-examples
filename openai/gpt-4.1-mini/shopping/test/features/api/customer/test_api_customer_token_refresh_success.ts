import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new connection instance for customer join
  const customerJoinConnection: api.IConnection = { host: connection.host };
  // 2. Customer registration and obtain authorized session with tokens
  const authorized1 = await authorize_customer_join(customerJoinConnection, {});
  typia.assert(authorized1);
  // 3. Prepare a connection for token refresh testing
  const customerRefreshConnection: api.IConnection = { host: connection.host };
  // 4. Call the refresh endpoint with the old refresh token
  const refreshed = await authorize_customer_refresh(
    customerRefreshConnection,
    {
      body: {
        refreshToken: authorized1.token.refresh,
      } satisfies IShoppingMallCustomer.IRefresh,
    },
  );
  typia.assert(refreshed);
  // 5. Tokens should differ to confirm rotation
  TestValidator.notEquals(
    "access token rotated",
    authorized1.token.access,
    refreshed.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    authorized1.token.refresh,
    refreshed.token.refresh,
  );
  // 6. Validate expiration timestamps are still date-time strings
  TestValidator.predicate(
    "access expired_at format",
    typeof refreshed.token.expired_at === "string" &&
      refreshed.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh refreshable_until format",
    typeof refreshed.token.refreshable_until === "string" &&
      refreshed.token.refreshable_until.length > 0,
  );
  // 7. Validate that the new authorized object contains required properties
  TestValidator.predicate(
    "customer id is a uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      refreshed.id,
    ),
  );
  TestValidator.predicate(
    "email is non-empty string",
    typeof refreshed.email === "string" && refreshed.email.length > 0,
  );
  // 8. Ensure displayName and phoneNumber possibly null or string
  TestValidator.predicate(
    "displayName is string or null",
    refreshed.displayName === null || typeof refreshed.displayName === "string",
  );
  TestValidator.predicate(
    "phoneNumber is string or null",
    refreshed.phoneNumber === null || typeof refreshed.phoneNumber === "string",
  );
  // 9. Validate the dates are ISO 8601 date-time strings
  TestValidator.predicate(
    "createdAt is ISO date-time",
    !isNaN(Date.parse(refreshed.createdAt)) &&
      refreshed.createdAt.endsWith("Z"),
  );
  TestValidator.predicate(
    "updatedAt is ISO date-time",
    !isNaN(Date.parse(refreshed.updatedAt)) &&
      refreshed.updatedAt.endsWith("Z"),
  );
  // 10. deletedAt is either null or ISO date-time string
  TestValidator.predicate(
    "deletedAt is null or ISO date-time",
    refreshed.deletedAt === null ||
      (!isNaN(Date.parse(refreshed.deletedAt)) &&
        refreshed.deletedAt.endsWith("Z")),
  );
}
