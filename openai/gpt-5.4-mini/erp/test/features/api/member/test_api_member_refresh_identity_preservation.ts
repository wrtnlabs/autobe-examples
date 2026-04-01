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

export async function test_api_member_refresh_identity_preservation(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_member_refresh(refreshConnection, {
    body: {
      refreshToken: joined.token.refresh,
    } satisfies IErpHrmTimeMember.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.equals("member id preserved", refreshed.id, joined.id);
  TestValidator.equals("member email preserved", refreshed.email, joined.email);
  TestValidator.equals(
    "display name preserved",
    refreshed.displayName,
    joined.displayName,
  );
  TestValidator.equals(
    "avatar preserved",
    refreshed.avatarImageUrl,
    joined.avatarImageUrl,
  );
  TestValidator.equals(
    "phone preserved",
    refreshed.phoneNumber,
    joined.phoneNumber,
  );
  TestValidator.notEquals(
    "access token rotated",
    refreshed.token.access,
    joined.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshed.token.refresh,
    joined.token.refresh,
  );
  TestValidator.predicate(
    "access token present",
    refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token present",
    refreshed.token.refresh.length > 0,
  );
  const secondRefreshConnection: api.IConnection = { host: connection.host };
  const secondRefreshed = await authorize_member_refresh(
    secondRefreshConnection,
    {
      body: {
        refreshToken: refreshed.token.refresh,
      } satisfies IErpHrmTimeMember.IRefresh,
    },
  );
  typia.assert(secondRefreshed);
  TestValidator.equals(
    "second refresh keeps identity",
    secondRefreshed.id,
    joined.id,
  );
  TestValidator.equals(
    "second refresh keeps email",
    secondRefreshed.email,
    joined.email,
  );
  TestValidator.notEquals(
    "second access token rotated again",
    secondRefreshed.token.access,
    refreshed.token.access,
  );
  TestValidator.predicate(
    "second refresh token present",
    secondRefreshed.token.refresh.length > 0,
  );
}
