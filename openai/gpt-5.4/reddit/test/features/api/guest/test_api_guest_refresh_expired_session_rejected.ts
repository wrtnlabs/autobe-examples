import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_expired_session_rejected(
  connection: api.IConnection,
): Promise<void> {
  const guestJoinConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformGuest.IJoin;
  const joined = await authorize_guest_join(guestJoinConnection, {
    body: joinInput,
  });
  typia.assert(joined);
  TestValidator.notEquals("guest id exists", joined.id, "");
  TestValidator.notEquals("guest key exists", joined.guest_key, "");
  TestValidator.notEquals("access token exists", joined.token.access, "");
  TestValidator.notEquals("refresh token exists", joined.token.refresh, "");
  TestValidator.notEquals(
    "access and refresh tokens differ",
    joined.token.access,
    joined.token.refresh,
  );
  TestValidator.predicate(
    "refreshable window is not earlier than access expiration",
    new Date(joined.token.refreshable_until).getTime() >=
      new Date(joined.token.expired_at).getTime(),
  );
  TestValidator.equals(
    "join sets authorization header",
    guestJoinConnection.headers?.Authorization,
    joined.token.access,
  );
  const guestRefreshConnection: api.IConnection = { host: connection.host };
  const refreshInput = {
    refresh: false,
    href: joinInput.href,
    referrer: joinInput.referrer,
    ip: joinInput.ip,
  } satisfies ICommunityPlatformGuest.IRefresh;
  await TestValidator.error(
    "non-refreshable guest refresh attempt is rejected",
    async () => {
      await authorize_guest_refresh(guestRefreshConnection, {
        body: refreshInput,
      });
    },
  );
}
