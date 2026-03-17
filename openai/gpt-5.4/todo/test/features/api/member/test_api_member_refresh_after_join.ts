import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_after_join(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {});
  typia.assert(joined);
  const originalToken: IAuthorizationToken = joined.token;
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh: originalToken.refresh,
    } satisfies ITodoAppMember.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.equals("same member id after refresh", refreshed.id, joined.id);
  TestValidator.equals(
    "same member email after refresh",
    refreshed.email,
    joined.email,
  );
  TestValidator.equals(
    "same email verification state after refresh",
    refreshed.email_verified,
    joined.email_verified,
  );
  TestValidator.equals(
    "same member creation time after refresh",
    refreshed.created_at,
    joined.created_at,
  );
  TestValidator.equals(
    "same deletion status after refresh",
    refreshed.deleted_at,
    joined.deleted_at,
  );
  TestValidator.predicate(
    "refreshed access token is non-empty",
    refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token is non-empty",
    refreshed.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "refreshed access expiration is non-empty",
    refreshed.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshed refreshable deadline is non-empty",
    refreshed.token.refreshable_until.length > 0,
  );
  TestValidator.notEquals(
    "access token rotated on refresh",
    refreshed.token.access,
    originalToken.access,
  );
  TestValidator.notEquals(
    "refresh token rotated on refresh",
    refreshed.token.refresh,
    originalToken.refresh,
  );
  TestValidator.predicate(
    "access expiration not earlier after refresh",
    new Date(refreshed.token.expired_at).getTime() >=
      new Date(originalToken.expired_at).getTime(),
  );
  TestValidator.predicate(
    "refreshable deadline not earlier after refresh",
    new Date(refreshed.token.refreshable_until).getTime() >=
      new Date(originalToken.refreshable_until).getTime(),
  );
}
