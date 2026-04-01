import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_active_session(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_guest_join(guestConnection, {
    body: {
      href: "https://example.com/guest/join",
      referrer: "https://example.com/landing",
      email: typia.random<string & tags.Format<"email">>(),
      token: RandomGenerator.alphaNumeric(16),
      invitationCode: RandomGenerator.alphaNumeric(12),
    } satisfies IErpHrmTimeGuest.IJoin,
  });
  typia.assert(joined);
  const originalGuestId = joined.id;
  const originalToken = joined.token;
  const refreshed = await authorize_guest_refresh(guestConnection, {
    body: {} satisfies IErpHrmTimeGuest.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.equals(
    "guest identity should be preserved",
    refreshed.id,
    originalGuestId,
  );
  TestValidator.notEquals(
    "access token should rotate on refresh",
    refreshed.token.access,
    originalToken.access,
  );
  TestValidator.notEquals(
    "refresh token should rotate on refresh",
    refreshed.token.refresh,
    originalToken.refresh,
  );
  TestValidator.notEquals(
    "access expiration should be updated",
    refreshed.token.expired_at,
    originalToken.expired_at,
  );
  TestValidator.notEquals(
    "refreshable until should be updated",
    refreshed.token.refreshable_until,
    originalToken.refreshable_until,
  );
  const refreshedConnection: api.IConnection = { host: connection.host };
  refreshedConnection.headers = {
    Authorization: refreshed.token.access,
  };
  const refreshedAgain = await authorize_guest_refresh(refreshedConnection, {
    body: {} satisfies IErpHrmTimeGuest.IRefresh,
  });
  typia.assert(refreshedAgain);
  TestValidator.equals(
    "refreshed guest identity should stay the same",
    refreshedAgain.id,
    refreshed.id,
  );
  TestValidator.notEquals(
    "second refresh should issue a new access token",
    refreshedAgain.token.access,
    refreshed.token.access,
  );
  TestValidator.notEquals(
    "second refresh should issue a new refresh token",
    refreshedAgain.token.refresh,
    refreshed.token.refresh,
  );
}
