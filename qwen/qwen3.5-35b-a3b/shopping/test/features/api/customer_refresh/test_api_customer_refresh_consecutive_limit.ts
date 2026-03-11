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
  // 1. Customer registration
  const joinConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const joinResponse = await authorize_customer_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string,
      password: password,
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(joinResponse);
  // Store credentials for re-authentication
  const customerEmail = joinResponse.email;
  // 2. Perform 10 successful consecutive refreshes
  let currentRefreshToken: string = joinResponse.token.refresh;
  const refreshTokens: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const refreshConnection: api.IConnection = { host: connection.host };
    const refreshResponse = await authorize_customer_refresh(
      refreshConnection,
      {
        body: {
          refresh_token: currentRefreshToken,
        } satisfies IEcommerceMallCustomer.IRefresh,
      },
    );
    typia.assert(refreshResponse);
    // Store the new refresh token for next iteration
    currentRefreshToken = refreshResponse.token.refresh;
    refreshTokens.push(currentRefreshToken);
    // Validate token structure
    typia.assert(refreshResponse.token);
  }
  // Verify we collected 10 unique refresh tokens
  TestValidator.equals("10 successful refreshes", refreshTokens.length, 10);
  // 3. Attempt 11th refresh - should fail due to consecutive limit
  const failConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "11th refresh should fail due to consecutive limit",
    async () => {
      await authorize_customer_refresh(failConnection, {
        body: {
          refresh_token: currentRefreshToken,
        } satisfies IEcommerceMallCustomer.IRefresh,
      });
    },
  );
  // 4. Verify old tokens cannot be used after limit
  // Try using the last valid refresh token again - should also fail
  await TestValidator.error(
    "old refresh token cannot be reused after limit exceeded",
    async () => {
      await authorize_customer_refresh(failConnection, {
        body: {
          refresh_token: currentRefreshToken,
        } satisfies IEcommerceMallCustomer.IRefresh,
      });
    },
  );
  // 5. Customer must use login to establish new session (login endpoint doesn't exist in DTOs)
  // Skip this step as IEcommerceMallCustomer.ILogin type is not available in provided DTOs
}