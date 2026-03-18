import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_success_renew_tokens(
  connection: api.IConnection,
): Promise<void> {
  // 1) Create guest identity/session and obtain refresh token
  const guestConnection: api.IConnection = { host: connection.host };
  const deviceFingerprint = RandomGenerator.alphabets(12);
  const joined = await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint,
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(joined);
  TestValidator.predicate("guest id exists", () => joined.id.length > 0);
  TestValidator.predicate(
    "refresh token exists",
    () => joined.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token exists",
    () => joined.token.access.length > 0,
  );
  // 2) Renew tokens using refresh token
  const refreshedConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_guest_refresh(refreshedConnection, {
    body: typia.assert<IMultiUserTodoGuest.IRefresh>({
      refreshToken: joined.token.refresh,
    }),
  });
  typia.assert(refreshed);
  // 3) Validate response and business expectations
  TestValidator.equals("guest id remains same", refreshed.id, joined.id);
  TestValidator.predicate(
    "new access token exists",
    () => refreshed.token.access.length > 0,
  );
  TestValidator.notEquals(
    "access token rotated",
    refreshed.token.access,
    joined.token.access,
  );
  // 4) Validate expiration metadata are present (format validated by typia.assert)
  TestValidator.predicate(
    "expired_at exists",
    () => refreshed.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until exists",
    () => refreshed.token.refreshable_until.length > 0,
  );
}
