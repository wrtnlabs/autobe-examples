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

export async function test_api_member_refresh_token_renewal(
  connection: api.IConnection,
): Promise<void> {
  const signUpConnection: api.IConnection = { host: connection.host };
  const initial = await authorize_member_join(signUpConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(initial);
  const originalToken = initial.token;
  const refreshConnection: api.IConnection = { host: connection.host };
  const renewed = await authorize_member_refresh(refreshConnection, {
    body: {
      refreshToken: originalToken.refresh,
    } satisfies IErpHrmTimeMember.IRefresh,
  });
  typia.assert(renewed);
  TestValidator.equals(
    "member id should stay the same",
    renewed.id,
    initial.id,
  );
  TestValidator.equals(
    "member email should stay the same",
    renewed.email,
    initial.email,
  );
  TestValidator.equals(
    "member display name should stay the same",
    renewed.displayName,
    initial.displayName,
  );
  TestValidator.equals(
    "avatar image url should stay the same",
    renewed.avatarImageUrl,
    initial.avatarImageUrl,
  );
  TestValidator.equals(
    "phone number should stay the same",
    renewed.phoneNumber,
    initial.phoneNumber,
  );
  TestValidator.equals(
    "created timestamp should stay the same",
    renewed.createdAt,
    initial.createdAt,
  );
  TestValidator.notEquals(
    "access token should be renewed",
    renewed.token.access,
    originalToken.access,
  );
  TestValidator.notEquals(
    "refresh token should be rotated",
    renewed.token.refresh,
    originalToken.refresh,
  );
  TestValidator.predicate(
    "refreshable until should be a valid timestamp",
    new Date(renewed.token.refreshable_until).getTime() > 0,
  );
  const replayConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "old refresh token should not be reusable after renewal",
    async () => {
      await authorize_member_refresh(replayConnection, {
        body: {
          refreshToken: originalToken.refresh,
        } satisfies IErpHrmTimeMember.IRefresh,
      });
    },
  );
}
