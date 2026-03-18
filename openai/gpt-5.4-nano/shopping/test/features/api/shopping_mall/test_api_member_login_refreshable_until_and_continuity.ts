import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_refreshable_until_and_continuity(
  connection: api.IConnection,
): Promise<void> {
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const email = typia.random<string & tags.Format<"email">>();
  const joined: IShoppingMallMember.IAuthorized = await authorize_member_join(
    memberJoinConnection,
    {
      body: {
        email,
        password,
      },
    },
  );
  typia.assert(joined);
  const memberLoginConnection: api.IConnection = { host: connection.host };
  const login: IShoppingMallMember.IAuthorized = await authorize_member_login(
    memberLoginConnection,
    {
      body: {
        email,
        password,
      },
    },
  );
  typia.assert(login);
  TestValidator.predicate(
    "login token expired_at should parse as date-time",
    () => !Number.isNaN(new Date(login.token.expired_at).getTime()),
  );
  TestValidator.predicate(
    "login token refreshable_until should parse as date-time",
    () => !Number.isNaN(new Date(login.token.refreshable_until).getTime()),
  );
  const expiredAt = new Date(login.token.expired_at).getTime();
  const refreshableUntil = new Date(login.token.refreshable_until).getTime();
  TestValidator.equals(
    "refreshable_until should be >= expired_at",
    refreshableUntil >= expiredAt,
    true,
  );
  const refresh: IShoppingMallMember.IAuthorized =
    await authorize_member_refresh(memberLoginConnection, {
      body: {
        refreshToken: login.token.refresh,
      },
    });
  typia.assert(refresh);
  TestValidator.predicate(
    "refreshed token expired_at should parse as date-time",
    () => !Number.isNaN(new Date(refresh.token.expired_at).getTime()),
  );
  TestValidator.predicate(
    "refreshed token refreshable_until should parse as date-time",
    () => !Number.isNaN(new Date(refresh.token.refreshable_until).getTime()),
  );
  const refreshedExpiredAt = new Date(refresh.token.expired_at).getTime();
  const refreshedRefreshableUntil = new Date(
    refresh.token.refreshable_until,
  ).getTime();
  TestValidator.equals(
    "refreshed refreshable_until should be >= refreshed expired_at",
    refreshedRefreshableUntil >= refreshedExpiredAt,
    true,
  );
}
