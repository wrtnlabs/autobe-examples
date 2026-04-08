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

export async function test_api_member_refresh_cross_account_rejected(
  connection: api.IConnection,
): Promise<void> {
  const firstConnection: api.IConnection = { host: connection.host };
  const secondConnection: api.IConnection = { host: connection.host };
  const firstJoined = await authorize_member_join(firstConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(12)}@test.com` satisfies string,
      password: "password123!" satisfies string,
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/landing",
      avatarImageUrl: null,
      phoneNumber: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(firstJoined);
  const secondJoined = await authorize_member_join(secondConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(12)}-2@test.com` satisfies string,
      password: "password123!" satisfies string,
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/landing",
      avatarImageUrl: null,
      phoneNumber: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(secondJoined);
  const refreshedFirst = await authorize_member_refresh(firstConnection, {
    body: {
      refreshToken: firstJoined.token.refresh,
    } satisfies IErpHrmTimeMember.IRefresh,
  });
  typia.assert(refreshedFirst);
  TestValidator.equals(
    "first account id preserved after refresh",
    refreshedFirst.id,
    firstJoined.id,
  );
  TestValidator.equals(
    "first account email preserved after refresh",
    refreshedFirst.email,
    firstJoined.email,
  );
  const refreshedSecond = await authorize_member_refresh(secondConnection, {
    body: {
      refreshToken: secondJoined.token.refresh,
    } satisfies IErpHrmTimeMember.IRefresh,
  });
  typia.assert(refreshedSecond);
  TestValidator.equals(
    "second account id preserved after refresh",
    refreshedSecond.id,
    secondJoined.id,
  );
  TestValidator.equals(
    "second account email preserved after refresh",
    refreshedSecond.email,
    secondJoined.email,
  );
  await TestValidator.httpError(
    "cross-account refresh token must be rejected",
    401,
    async () => {
      await authorize_member_refresh(
        { host: connection.host },
        {
          body: {
            refreshToken: firstJoined.token.refresh,
          } satisfies IErpHrmTimeMember.IRefresh,
        },
      );
    },
  );
}
