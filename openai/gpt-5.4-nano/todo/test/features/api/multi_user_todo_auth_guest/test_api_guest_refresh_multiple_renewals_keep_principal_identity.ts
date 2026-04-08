import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_multiple_renewals_keep_principal_identity(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const initialGuestInput = {
    display_name: RandomGenerator.name(),
    password: "Passw0rd!1234",
    href: "https://example.com/guest/join",
    referrer: "https://example.com/guest",
    ip: "127.0.0.1",
  } satisfies IMultiUserTodoUserProfile.IJoin;
  const joined = await authorize_guest_join(guestConnection, {
    body: initialGuestInput,
  });
  typia.assert(joined);
  const refreshTokenA: string = joined.token.refresh;
  const joinedPrincipalId: string = joined.id;
  const joinedPrincipalUserId: string = joined.multi_user_todo_user_id;
  const firstRefreshConnection: api.IConnection = { host: connection.host };
  const firstRefresh = await authorize_guest_refresh(firstRefreshConnection, {
    body: {
      refreshToken: refreshTokenA,
    } satisfies IMultiUserTodoUserProfile.IRefresh,
  });
  typia.assert(firstRefresh);
  const refreshTokenB: string = firstRefresh.token.refresh;
  TestValidator.equals(
    "principal id should remain identical after first refresh",
    firstRefresh.id,
    joinedPrincipalId,
  );
  TestValidator.equals(
    "principal multi_user_todo_user_id should remain identical after first refresh",
    firstRefresh.multi_user_todo_user_id,
    joinedPrincipalUserId,
  );
  TestValidator.notEquals(
    "access token should change after first refresh",
    firstRefresh.token.access,
    joined.token.access,
  );
  TestValidator.notEquals(
    "refresh token should change after first refresh",
    firstRefresh.token.refresh,
    refreshTokenA,
  );
  const joinedExpiredAtMs = Date.parse(joined.token.expired_at);
  const firstExpiredAtMs = Date.parse(firstRefresh.token.expired_at);
  TestValidator.predicate(
    "access token expiration should be refreshed after first refresh",
    () =>
      Number.isFinite(joinedExpiredAtMs) && Number.isFinite(firstExpiredAtMs)
        ? firstExpiredAtMs > joinedExpiredAtMs
        : false,
  );
  const joinedRefreshableUntilMs = Date.parse(joined.token.refreshable_until);
  const firstRefreshableUntilMs = Date.parse(
    firstRefresh.token.refreshable_until,
  );
  TestValidator.predicate(
    "refreshable deadline should be refreshed/extended after first refresh",
    () =>
      Number.isFinite(joinedRefreshableUntilMs) &&
      Number.isFinite(firstRefreshableUntilMs)
        ? firstRefreshableUntilMs >= joinedRefreshableUntilMs
        : false,
  );
  const secondRefreshConnection: api.IConnection = { host: connection.host };
  const secondRefresh = await authorize_guest_refresh(secondRefreshConnection, {
    body: {
      refreshToken: refreshTokenB,
    } satisfies IMultiUserTodoUserProfile.IRefresh,
  });
  typia.assert(secondRefresh);
  TestValidator.equals(
    "principal id should remain identical after second refresh",
    secondRefresh.id,
    joinedPrincipalId,
  );
  TestValidator.equals(
    "principal multi_user_todo_user_id should remain identical after second refresh",
    secondRefresh.multi_user_todo_user_id,
    joinedPrincipalUserId,
  );
  TestValidator.notEquals(
    "access token should change after second refresh",
    secondRefresh.token.access,
    firstRefresh.token.access,
  );
  TestValidator.notEquals(
    "refresh token should change after second refresh",
    secondRefresh.token.refresh,
    refreshTokenB,
  );
  const firstExpiredAtMs2 = Date.parse(secondRefresh.token.expired_at);
  TestValidator.predicate(
    "access token expiration should be refreshed after second refresh",
    () =>
      Number.isFinite(firstExpiredAtMs2)
        ? firstExpiredAtMs2 > firstExpiredAtMs
        : false,
  );
  const firstRefreshableUntilMs2 = Date.parse(
    secondRefresh.token.refreshable_until,
  );
  TestValidator.predicate(
    "refreshable deadline should be refreshed/extended after second refresh",
    () =>
      Number.isFinite(firstRefreshableUntilMs2)
        ? firstRefreshableUntilMs2 >= firstRefreshableUntilMs
        : false,
  );
}
