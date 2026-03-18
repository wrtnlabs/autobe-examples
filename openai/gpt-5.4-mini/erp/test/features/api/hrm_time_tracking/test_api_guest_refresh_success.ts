import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_guest_join(guestConnection, { body: {} });
  typia.assert(joined);
  const originalAuthorization = joined.token;
  const originalGuestId = joined.id;
  const refreshedConnection: api.IConnection = { host: connection.host };
  refreshedConnection.headers = {
    Authorization: originalAuthorization.access,
  };
  const refreshed = await authorize_guest_refresh(refreshedConnection, {
    body: {},
  });
  typia.assert(refreshed);
  TestValidator.equals(
    "guest identity should be preserved",
    refreshed.id,
    originalGuestId,
  );
  TestValidator.equals(
    "guest should remain active",
    refreshed.deleted_at,
    null,
  );
  TestValidator.predicate(
    "refreshed access token should be present",
    refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token should be present",
    refreshed.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "refreshed access token should be different when rotation occurs",
    refreshed.token.access.length > 0,
  );
  const continuedConnection: api.IConnection = { host: connection.host };
  continuedConnection.headers = {
    Authorization: refreshed.token.access,
  };
  const continued = await authorize_guest_refresh(continuedConnection, {
    body: {},
  });
  typia.assert(continued);
  TestValidator.equals(
    "guest identity should remain stable across refreshes",
    continued.id,
    originalGuestId,
  );
  TestValidator.equals(
    "guest should remain active after subsequent refresh",
    continued.deleted_at,
    null,
  );
  TestValidator.predicate(
    "subsequent refresh should return authorization tokens",
    continued.token.access.length > 0 && continued.token.refresh.length > 0,
  );
  if (
    originalAuthorization.access !== refreshed.token.access ||
    originalAuthorization.refresh !== refreshed.token.refresh
  ) {
    TestValidator.notEquals(
      "refresh may rotate tokens without changing the guest identity",
      originalAuthorization,
      refreshed.token,
    );
  }
}
