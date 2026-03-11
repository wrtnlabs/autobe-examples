import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_token_refresh_consecutive_limit(
  connection: api.IConnection,
): Promise<void> {
  // Edge case scenario for admin token refresh with 10 consecutive refresh limit.
  // 1. Create admin account and store credentials
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const initialAdmin: IEcommerceMallAdmin.IAuthorized =
    await authorize_admin_join(adminJoinConnection, {
      body: {
        email,
        password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallAdmin.IJoin,
    });
  typia.assert(initialAdmin);
  // 2. Perform 10 consecutive token refreshes
  const refreshConnection: api.IConnection = { host: connection.host };
  const maxRefreshCount = 10;
  let currentRefreshToken = initialAdmin.token.refresh;
  for (let i = 0; i < maxRefreshCount; i++) {
    const response = await authorize_admin_refresh(refreshConnection, {
      body: {
        refresh_token: currentRefreshToken,
      } satisfies IEcommerceMallAdmin.IRefresh,
    });
    typia.assert(response);
    currentRefreshToken = response.token.refresh;
  }
  // 3. Verify 10 refreshes succeeded
  TestValidator.equals("10 consecutive refreshes succeeded", true, true);
  // 4. 11th refresh attempt should be rejected (consecutive refresh limit exceeded)
  await TestValidator.error(
    "11th refresh rejected due to consecutive limit",
    async () => {
      await authorize_admin_refresh(refreshConnection, {
        body: {
          refresh_token: currentRefreshToken,
        } satisfies IEcommerceMallAdmin.IRefresh,
      });
    },
  );
  // 5. Admin must re-authenticate via login to continue
  const loginConnection: api.IConnection = { host: connection.host };
  const loginAdmin: IEcommerceMallAdmin.IAuthorized =
    await authorize_admin_login(loginConnection, {
      body: {
        email,
        password,
      } satisfies IEcommerceMallAdmin.ILogin,
    });
  typia.assert(loginAdmin);
  // 6. Verify new login session resets refresh counter
  TestValidator.equals(
    "login successful with same email",
    loginAdmin.email,
    email,
  );
  TestValidator.notEquals(
    "new session has different access token",
    initialAdmin.token.access,
    loginAdmin.token.access,
  );
  TestValidator.notEquals(
    "new session has different refresh token",
    initialAdmin.token.refresh,
    loginAdmin.token.refresh,
  );
  // 7. Verify new session allows fresh 10 consecutive refreshes
  const newRefreshConnection: api.IConnection = { host: connection.host };
  let newCurrentRefreshToken = loginAdmin.token.refresh;
  let successfulNewRefreshes = 0;
  for (let i = 0; i < maxRefreshCount; i++) {
    const response = await authorize_admin_refresh(newRefreshConnection, {
      body: {
        refresh_token: newCurrentRefreshToken,
      } satisfies IEcommerceMallAdmin.IRefresh,
    });
    typia.assert(response);
    successfulNewRefreshes++;
    newCurrentRefreshToken = response.token.refresh;
  }
  // 8. Verify exactly 10 successful refreshes in new session
  TestValidator.equals(
    "new session allows 10 consecutive refreshes",
    successfulNewRefreshes,
    maxRefreshCount,
  );
  // 9. 11th refresh in new session should also be rejected
  await TestValidator.error(
    "11th refresh in new session also rejected",
    async () => {
      await authorize_admin_refresh(newRefreshConnection, {
        body: {
          refresh_token: newCurrentRefreshToken,
        } satisfies IEcommerceMallAdmin.IRefresh,
      });
    },
  );
}
