import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_reuse_rejected(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/erpHrmTime/auth/member/join",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const originalRefresh: string = joined.token.refresh;
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_member_refresh(refreshConnection, {
    body: {
      refreshToken: originalRefresh,
    } satisfies IErpHrmTimeMember.IRefresh,
  });
  typia.assert(refreshed);
  const rotatedRefresh: string = refreshed.token.refresh;
  await TestValidator.error(
    "reusing the previous refresh token should be rejected",
    async () => {
      const replayConnection: api.IConnection = { host: connection.host };
      await authorize_member_refresh(replayConnection, {
        body: {
          refreshToken: originalRefresh,
        } satisfies IErpHrmTimeMember.IRefresh,
      });
    },
  );
  if (rotatedRefresh !== originalRefresh) {
    const continuedConnection: api.IConnection = { host: connection.host };
    const continued = await authorize_member_refresh(continuedConnection, {
      body: {
        refreshToken: rotatedRefresh,
      } satisfies IErpHrmTimeMember.IRefresh,
    });
    typia.assert(continued);
  }
}
