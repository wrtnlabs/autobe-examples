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

export async function test_api_customer_refresh_with_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Join as customer to obtain initial refresh token
  const joinBody: IShoppingMallCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  const authorized = await authorize_customer_join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // Step 2: Extract refresh token from initial authorization
  const refreshBody: IShoppingMallCustomer.IRefresh = {
    refresh_token: authorized.token.refresh,
  };
  // Step 3: Refresh access token using valid refresh token
  const refreshed = await authorize_customer_refresh(connection, {
    body: refreshBody,
  });
  typia.assert(refreshed);
  // Step 4: Validate that refresh operation preserved customer identity
  TestValidator.equals("customer ID unchanged", authorized.id, refreshed.id);
  TestValidator.equals("email unchanged", authorized.email, refreshed.email);
  TestValidator.equals(
    "display_name unchanged",
    authorized.display_name,
    refreshed.display_name,
  );
  TestValidator.equals(
    "phone_number unchanged",
    authorized.phone_number,
    refreshed.phone_number,
  );
  // Step 5: Validate access token renewal (new access token)
  TestValidator.notEquals(
    "new access token issued",
    authorized.token.access,
    refreshed.token.access,
  );
  // Step 6: Validate refresh token unchanged (same refresh token)
  TestValidator.equals(
    "refresh token preserved",
    authorized.token.refresh,
    refreshed.token.refresh,
  );
  // Step 7: Validate expiration metadata
  TestValidator.predicate("new access token has 30-minute TTL", () => {
    const now = new Date();
    const expiredAt = new Date(refreshed.token.expired_at);
    const timeDiff = expiredAt.getTime() - now.getTime();
    // 30 minutes = 1,800,000 ms, allow 10-second grace for processing time
    return timeDiff >= 1790000 && timeDiff <= 1810000;
  });
  // Step 8: Validate refreshable_until unchanged (same as initial)
  TestValidator.equals(
    "refreshable_until unchanged",
    authorized.token.refreshable_until,
    refreshed.token.refreshable_until,
  );
}
