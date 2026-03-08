import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_expired_token_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member to obtain credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "test_password_1234";
  const displayName = typia.random<string & tags.Format<"uuid">>();
  await authorize_member_join(joinConnection, {
    body: {
      email,
      password,
      displayName,
      bio: "Test bio for member",
      href: "http://example.com/register",
      referrer: "http://example.com",
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  // 2. Login member to obtain valid tokens
  const loginConnection: api.IConnection = { host: connection.host };
  const loginOutput = await authorize_member_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IEconomicPoliticalBoardMember.ILogin,
  });
  typia.assert(loginOutput);
  // 3. Attempt to refresh with invalid/expired token
  const refreshConnection: api.IConnection = { host: connection.host };
  const invalidRefreshToken: IEconomicPoliticalBoardMember.IRefresh = {
    refreshToken: "invalid-expired-token-format",
  } satisfies IEconomicPoliticalBoardMember.IRefresh;
  // 4. Verify 401 Unauthorized for invalid token
  await TestValidator.httpError(
    "should return 401 for invalid refresh token",
    401,
    async () => {
      await api.functional.economicPoliticalBoard.auth.member.refresh(
        refreshConnection,
        {
          body: invalidRefreshToken,
        },
      );
    },
  );
  // 5. Verify re-authentication with valid credentials restores access
  const reauthConnection: api.IConnection = { host: connection.host };
  const freshLoginOutput = await authorize_member_login(reauthConnection, {
    body: {
      email,
      password,
    } satisfies IEconomicPoliticalBoardMember.ILogin,
  });
  typia.assert(freshLoginOutput);
  // 6. Verify fresh token can be used for refresh
  const validRefreshConnection: api.IConnection = { host: connection.host };
  const validRefreshOutput =
    await api.functional.economicPoliticalBoard.auth.member.refresh(
      validRefreshConnection,
      {
        body: {
          refreshToken: freshLoginOutput.token.refresh,
        } satisfies IEconomicPoliticalBoardMember.IRefresh,
      },
    );
  typia.assert(validRefreshOutput);
}
