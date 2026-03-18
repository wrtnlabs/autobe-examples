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

export async function test_api_guest_token_refresh_rotation_replay_prevention(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const deviceFingerprint = typia.random<string>();
  const guestJoinBody = {
    device_fingerprint: deviceFingerprint,
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformGuest.IJoin;
  const joined = await authorize_guest_join(joinConnection, {
    body: guestJoinBody,
  });
  typia.assert(joined);
  const refresh1Connection: api.IConnection = { host: connection.host };
  const refresh1 = await authorize_guest_refresh(refresh1Connection, {
    body: {
      refreshToken: joined.refresh_token,
    } satisfies ICommunityPlatformGuest.IRefresh,
  });
  typia.assert(refresh1);
  const refresh2Connection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "replay prevention rejects old refresh token",
    [401, 403],
    async () =>
      await authorize_guest_refresh(refresh2Connection, {
        body: {
          refreshToken: joined.refresh_token,
        } satisfies ICommunityPlatformGuest.IRefresh,
      }),
  );
  if (refresh1.refresh_token !== joined.refresh_token) {
    const refresh3Connection: api.IConnection = { host: connection.host };
    const refresh3 = await authorize_guest_refresh(refresh3Connection, {
      body: {
        refreshToken: refresh1.refresh_token,
      } satisfies ICommunityPlatformGuest.IRefresh,
    });
    typia.assert(refresh3);
    TestValidator.notEquals(
      "refresh token rotated",
      refresh1.refresh_token,
      refresh3.refresh_token,
    );
  }
}
