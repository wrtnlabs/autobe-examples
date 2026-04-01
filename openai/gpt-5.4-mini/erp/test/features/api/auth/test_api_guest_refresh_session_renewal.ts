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

export async function test_api_guest_refresh_session_renewal(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_guest_join(guestConnection, {
    body: {
      href: `https://example.com/guest/join/${RandomGenerator.alphaNumeric(12)}`,
      referrer: `https://example.com/landing/${RandomGenerator.alphaNumeric(8)}`,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      email: typia.random<string & tags.Format<"email">>(),
      token: RandomGenerator.alphaNumeric(16),
      invitationCode: RandomGenerator.alphaNumeric(12),
    } satisfies IErpHrmTimeGuest.IJoin,
  });
  typia.assert(joined);
  const refreshed = await authorize_guest_refresh(guestConnection, {
    body: {} satisfies IErpHrmTimeGuest.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.equals(
    "guest identity should remain stable across refresh",
    refreshed.id,
    joined.id,
  );
  TestValidator.notEquals(
    "refresh should issue a new access token",
    joined.token.access,
    refreshed.token.access,
  );
  TestValidator.notEquals(
    "refresh should issue a new refresh token",
    joined.token.refresh,
    refreshed.token.refresh,
  );
}
