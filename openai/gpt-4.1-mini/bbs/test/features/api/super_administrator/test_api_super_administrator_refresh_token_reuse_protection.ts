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

export async function test_api_super_administrator_refresh_token_reuse_protection(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that the refresh token cannot be reused to prevent replay attacks.
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Step 1: Register a new super administrator (joining automatically authenticates and returns tokens)
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
        href: "https://example.com/join",
        referrer: "https://example.com/referrer",
        ip: null,
      },
    },
  );
  typia.assert(authorized);
  // Create connection with authorized tokens
  const tokenConnection: api.IConnection = { host: connection.host };
  tokenConnection.headers = { Authorization: authorized.token.access };
  // Step 2: Use the refresh token to obtain new access and refresh tokens
  const firstRefresh = await authorize_super_administrator_refresh(
    tokenConnection,
    {
      body: { refreshToken: authorized.token.refresh },
    },
  );
  typia.assert(firstRefresh);
  // Update token connection with new access token from first refresh
  tokenConnection.headers.Authorization = firstRefresh.token.access;
  // Step 3: Attempt to reuse the same refresh token (authorized.token.refresh) again which should be rejected
  await TestValidator.error(
    "reuse of old refresh token should be rejected",
    async () => {
      await authorize_super_administrator_refresh(tokenConnection, {
        body: { refreshToken: authorized.token.refresh },
      });
    },
  );
  // Step 4: Use the refresh token obtained in first refresh (token should rotate and new token is used)
  const secondRefresh = await authorize_super_administrator_refresh(
    tokenConnection,
    {
      body: { refreshToken: firstRefresh.token.refresh },
    },
  );
  typia.assert(secondRefresh);
  // All assertions passed if no errors thrown
}
