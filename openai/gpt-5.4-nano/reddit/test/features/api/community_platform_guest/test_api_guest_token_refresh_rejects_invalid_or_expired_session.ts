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

export async function test_api_guest_token_refresh_rejects_invalid_or_expired_session(
  connection: api.IConnection,
): Promise<void> {
  // Prepare actor-specific connections
  const guestAConnection: api.IConnection = { host: connection.host };
  // 1) Guest join (session A)
  const guestAAuthorized = await authorize_guest_join(guestAConnection, {
    body: {
      device_fingerprint: typia.random<string>() satisfies string,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformGuest.IJoin,
  });
  typia.assert(guestAAuthorized);
  const refreshTokenA: string = guestAAuthorized.refresh_token;
  // 2) Guest join again (session B)
  const guestBConnection: api.IConnection = { host: connection.host };
  const guestBAuthorized = await authorize_guest_join(guestBConnection, {
    body: {
      device_fingerprint: typia.random<string>() satisfies string,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformGuest.IJoin,
  });
  typia.assert(guestBAuthorized);
  const refreshTokenB: string = guestBAuthorized.refresh_token;
  // 3) Attempt refresh using the
}
