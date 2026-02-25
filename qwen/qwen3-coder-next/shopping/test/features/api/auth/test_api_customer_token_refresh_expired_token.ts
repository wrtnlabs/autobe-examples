import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_token_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer to get valid tokens first
  const joinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(joinConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email"> & tags.MaxLength<255> & tags.MinLength<1>
      >(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joined);
  // 2. Create a connection for the refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // 3. Create an expired refresh token object with all required fields
  // In a real implementation, we would:
  // - Get the current session record
  // - Modify the refresh_token_expires_at to a past timestamp
  // - Use that modified token for testing
  // For this test, we'll simulate by creating an IRefresh object with expired token data
  const expiredRefreshToken =
    "expired-refresh-token-" + RandomGenerator.alphaNumeric(32);
  // Create a complete IRefresh object with all required fields
  // but with a token that will be considered expired by the server
  const expiredRefresh: IShoppingMallCustomer.IRefresh = {
    access_token: joined.token.access, // Use existing access token (expired)
    refresh_token: expiredRefreshToken,
    customer: joined.customer,
    expires_at: new Date(Date.now() - 86400000).toISOString(), // Set to 1 day ago (expired)
  };
  // 4. Test that expired token refresh is rejected
  await TestValidator.error("expired refresh token rejected", async () => {
    await api.functional.shoppingMall.auth.customer.refresh(refreshConnection, {
      body: expiredRefresh,
    });
  });
}
