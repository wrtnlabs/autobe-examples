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

export async function test_api_customer_refresh_consecutive_limit(
  connection: api.IConnection,
): Promise<void> {
  // Customer credentials for reuse across test steps
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  // 1. Register new customer
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_customer_join(joinConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResult);
  TestValidator.equals("customer registered", joinResult.email, customerEmail);
  // 2. Login to get initial refresh token
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_customer_login(loginConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    },
  });
  typia.assert(loginResult);
  let currentRefreshToken = loginResult.token.refresh;
  let currentHref = typia.random<string & tags.Format<"uri">>();
  let currentReferrer = typia.random<string & tags.Format<"uri">>();
  let currentIp = typia.random<string & tags.Format<"ipv4">>();
  // 3. Perform 10 successful refreshes
  for (let i = 0; i < 10; i++) {
    const refreshConnection: api.IConnection = { host: connection.host };
    const refreshResult = await authorize_customer_refresh(refreshConnection, {
      body: {
        refresh_token: currentRefreshToken,
        href: currentHref,
        referrer: currentReferrer,
        ip: currentIp,
      },
    });
    typia.assert(refreshResult);
    // Verify new tokens are issued
    TestValidator.equals(
      `refresh ${i + 1} returned tokens`,
      refreshResult.token.access.length > 0,
      true,
    );
    TestValidator.equals(
      `refresh ${i + 1} returned refresh token`,
      refreshResult.token.refresh.length > 0,
      true,
    );
    // Update tokens for next iteration
    currentRefreshToken = refreshResult.token.refresh;
    currentHref = typia.random<string & tags.Format<"uri">>();
    currentReferrer = typia.random<string & tags.Format<"uri">>();
    currentIp = typia.random<string & tags.Format<"ipv4">>();
  }
  TestValidator.equals("10 consecutive refreshes succeeded", true, true);
  // 4. On the 11th refresh attempt, verify rejection due to limit
  const rejectionConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "11th refresh rejected - consecutive limit exceeded",
    async () => {
      await authorize_customer_refresh(rejectionConnection, {
        body: {
          refresh_token: currentRefreshToken,
          href: currentHref,
          referrer: currentReferrer,
          ip: currentIp,
        },
      });
    },
  );
  // 5. Verify re-authentication is required (already tested by error above)
  // 6. Perform login to re-authenticate
  const reLoginConnection: api.IConnection = { host: connection.host };
  const reLoginResult = await authorize_customer_login(reLoginConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    },
  });
  typia.assert(reLoginResult);
  TestValidator.equals(
    "re-authentication successful",
    reLoginResult.email,
    customerEmail,
  );
  // 7. Verify new refresh token obtained
  TestValidator.equals(
    "new refresh token issued after re-auth",
    reLoginResult.token.refresh.length > 0,
    true,
  );
  // 8. Verify counter is reset by performing successful refresh
  const resetRefreshConnection: api.IConnection = { host: connection.host };
  const resetRefreshResult = await authorize_customer_refresh(
    resetRefreshConnection,
    {
      body: {
        refresh_token: reLoginResult.token.refresh,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(resetRefreshResult);
  TestValidator.equals(
    "refresh after re-auth succeeds - counter reset",
    resetRefreshResult.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh after re-auth returned refresh token",
    resetRefreshResult.token.refresh.length > 0,
    true,
  );
}
