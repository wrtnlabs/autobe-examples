import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPrivateTodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_token_expired(
  connection: api.IConnection,
): Promise<void> {
  // Create initial guest session to understand the token structure
  const guestConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_guest_join(guestConnection, {});
  typia.assert(authResult);
  // Test with an expired/invalid refresh token
  // Since we cannot wait for actual expiration in a test environment,
  // we use a crafted invalid token that the server will reject
  const expiredRefreshToken =
    "expired_token_" + RandomGenerator.alphaNumeric(32);
  // Expect 401 error when trying to refresh with expired token
  await TestValidator.httpError(
    "should reject expired refresh token",
    401,
    async () => {
      await api.functional.privateTodoApp.auth.guest.refresh(connection, {
        body: {
          refresh_token: expiredRefreshToken,
        } satisfies IPrivateTodoAppGuest.IRefresh,
      });
    },
  );
}
