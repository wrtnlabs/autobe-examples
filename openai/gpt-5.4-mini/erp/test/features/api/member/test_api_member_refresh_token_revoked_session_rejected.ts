import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_token_revoked_session_rejected(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@example.com`,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(joined);
  const refreshed = await authorize_member_refresh(memberConnection, {
    body: {
      refreshToken: joined.token.refresh,
    } satisfies IHrmTimeTrackingMember.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.notEquals(
    "refresh should issue a new access token",
    joined.token.access,
    refreshed.token.access,
  );
  TestValidator.equals(
    "member identity should remain stable after refresh",
    refreshed.id,
    joined.id,
  );
  TestValidator.equals(
    "member email should remain stable after refresh",
    refreshed.email,
    joined.email,
  );
  const staleRefreshToken = `${joined.token.refresh}.${RandomGenerator.alphabets(4)}`;
  await TestValidator.httpError(
    "stale refresh token must be rejected",
    [401, 403],
    async () => {
      await authorize_member_refresh(memberConnection, {
        body: {
          refreshToken: staleRefreshToken,
        } satisfies IHrmTimeTrackingMember.IRefresh,
      });
    },
  );
}
