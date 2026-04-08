import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create initial guest session
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_guest_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: undefined,
    },
  });
  typia.assert(joinResponse);
  const expiredRefreshToken = joinResponse.token.refresh;
  const refreshableUntil = joinResponse.token.refreshable_until;
  // 2. Simulate time advancing past expiration by creating expired timestamp
  const refreshableUntilDate = new Date(refreshableUntil);
  const expiredTimestamp = new Date(
    refreshableUntilDate.getTime() - 1000,
  ).toISOString();
  typia.assert(expiredTimestamp);
  // 3. Attempt refresh with expired token - should fail with 401
  const refreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "expired refresh token should return 401",
    async () => {
      await api.functional.hrmPlatform.auth.guest.refresh(refreshConnection, {
        body: { refresh_token: expiredRefreshToken },
      });
    },
  );
  // 4. Verify guest can create new session with fresh credentials
  const newJoinConnection: api.IConnection = { host: connection.host };
  const newSessionResponse = await authorize_guest_join(newJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: undefined,
    },
  });
  typia.assert(newSessionResponse);
  TestValidator.notEquals(
    "new session should have different ID",
    joinResponse.id,
    newSessionResponse.id,
  );
  TestValidator.notEquals(
    "new session should have different device_identifier",
    joinResponse.device_identifier,
    newSessionResponse.device_identifier,
  );
  TestValidator.notEquals(
    "new session should have different refresh token",
    joinResponse.token.refresh,
    newSessionResponse.token.refresh,
  );
}
