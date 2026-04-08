import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_with_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new guest account to get valid credentials
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {});
  typia.assert(authorized);
  // 2. Attempt to refresh with an invalid refresh token
  // Using a fake/tampered JWT that cannot be validated
  const invalidRefreshToken = "invalid.fake.jwt.token";
  await TestValidator.httpError(
    "should reject invalid refresh token with 401",
    401,
    async () =>
      await authorize_guest_refresh(guestConnection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IErpHrmGuest.IRefresh,
      }),
  );
}
