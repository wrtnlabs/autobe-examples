import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_refresh_token_success(
  connection: api.IConnection,
) {
  // 1. Super administrator joins and obtains initial tokens
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(authorized);
  // 2. Validate initial token structure
  TestValidator.predicate(
    "access token is a non-empty string",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is a non-empty string",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expired_at is valid ISO date",
    !isNaN(Date.parse(authorized.token.expired_at)),
  );
  TestValidator.predicate(
    "refresh token refreshable_until is valid ISO date",
    !isNaN(Date.parse(authorized.token.refreshable_until)),
  );
  // Save previous refresh token
  const prevRefreshToken = authorized.token.refresh;
  // 3. Successful refresh token usage
  const refreshed = await authorize_super_administrator_refresh(
    superAdminConnection,
    { body: { refreshToken: prevRefreshToken } },
  );
  typia.assert(refreshed);
  TestValidator.predicate(
    "refreshed access token is new and different",
    refreshed.token.access !== authorized.token.access,
  );
  TestValidator.predicate(
    "refreshed refresh token is new and different",
    refreshed.token.refresh !== prevRefreshToken,
  );
  TestValidator.predicate(
    "refreshed access token expired_at is valid ISO date",
    !isNaN(Date.parse(refreshed.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshed refresh token refreshable_until is valid ISO date",
    !isNaN(Date.parse(refreshed.token.refreshable_until)),
  );
  // 4. Attempt refresh with reused refresh token (should fail)
  await TestValidator.error(
    "refresh with reused refresh token should fail",
    async () => {
      await authorize_super_administrator_refresh(superAdminConnection, {
        body: { refreshToken: prevRefreshToken },
      });
    },
  );
  // 5. Attempt refresh with a completely fake expired refresh token
  await TestValidator.error(
    "refresh with fake expired refresh token should fail",
    async () => {
      await authorize_super_administrator_refresh(superAdminConnection, {
        body: {
          refreshToken:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake.expired.token",
        },
      });
    },
  );
}
