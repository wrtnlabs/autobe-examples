import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_refresh_previous_token_invalidated_after_rotation(
  connection: api.IConnection,
) {
  // 1. Setup admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Register a new administrator to obtain initial tokens
  const joinInput = {
    email: `${RandomGenerator.name().toLowerCase()}@example.com`,
    href: "https://example.com/registration",
    password: RandomGenerator.alphaNumeric(16),
    referrer: "https://example.com/registration",
  } satisfies IEcommercePlatformAdmin.IJoin;
  const initialAuth = await authorize_admin_join(adminConnection, {
    body: joinInput,
  });
  typia.assert(initialAuth);
  // 3. Extract the initial refresh token
  const initialRefreshToken = initialAuth.token.refresh;
  // 4. Perform the first refresh with the initial token
  // This should succeed and perform token rotation
  const firstRefreshInput = {
    refresh_token: initialRefreshToken,
  } satisfies IEcommercePlatformAdmin.IRefresh;
  const refreshedAuth = await authorize_admin_refresh(adminConnection, {
    body: firstRefreshInput,
  });
  typia.assert(refreshedAuth);
  // 5. Extract the new refresh token issued after rotation
  const newRefreshToken = refreshedAuth.token.refresh;
  // 6. Validate that the NEW refresh token works
  const validRefreshInput = {
    refresh_token: newRefreshToken,
  } satisfies IEcommercePlatformAdmin.IRefresh;
  const validRefreshAuth = await authorize_admin_refresh(adminConnection, {
    body: validRefreshInput,
  });
  typia.assert(validRefreshAuth);
  // 7. Validate that the OLD (initial) refresh token is now invalid
  // This confirms the token rotation invalidated the previous token
  await TestValidator.error(
    "previous refresh token should be invalid after rotation",
    async () => {
      const invalidRefreshInput = {
        refresh_token: initialRefreshToken,
      } satisfies IEcommercePlatformAdmin.IRefresh;
      await authorize_admin_refresh(adminConnection, {
        body: invalidRefreshInput,
      });
    },
  );
}
