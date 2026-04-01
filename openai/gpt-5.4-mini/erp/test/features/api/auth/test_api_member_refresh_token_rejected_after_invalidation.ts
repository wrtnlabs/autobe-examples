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

export async function test_api_member_refresh_token_rejected_after_invalidation(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = `${RandomGenerator.alphaNumeric(12)}@test.com`;
  const joinBody = {
    email,
    password: "Password123!",
    name: RandomGenerator.name(),
    href: "https://example.com/register",
    referrer: "https://example.com/",
    ip: null,
  } satisfies IErpHrmTimeMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  const firstRefreshToken = authorized.token.refresh;
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_member_refresh(refreshConnection, {
    body: {
      refreshToken: firstRefreshToken,
    } satisfies IErpHrmTimeMember.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.notEquals(
    "refresh token should rotate after successful refresh",
    firstRefreshToken,
    refreshed.token.refresh,
  );
  await TestValidator.httpError(
    "reusing the invalidated refresh token should be unauthorized",
    401,
    async () => {
      const rejectedConnection: api.IConnection = { host: connection.host };
      await authorize_member_refresh(rejectedConnection, {
        body: {
          refreshToken: firstRefreshToken,
        } satisfies IErpHrmTimeMember.IRefresh,
      });
    },
  );
}
