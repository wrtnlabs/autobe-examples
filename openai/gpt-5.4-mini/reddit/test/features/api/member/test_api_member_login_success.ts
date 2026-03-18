import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const username = RandomGenerator.alphabets(8);
  const displayName = RandomGenerator.name();
  const joined = await authorize_member_join(joinConnection, {
    body: {
      email,
      password,
      username,
      displayName,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(joined);
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedIn = await authorize_member_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(loggedIn);
  TestValidator.equals(
    "member id should match joined account",
    loggedIn.id,
    joined.id,
  );
  TestValidator.equals(
    "member email should match joined account",
    loggedIn.email,
    email,
  );
  TestValidator.equals(
    "member username should match joined account",
    loggedIn.username,
    username,
  );
  TestValidator.equals(
    "member display name should match joined account",
    loggedIn.displayName,
    displayName,
  );
  TestValidator.equals("member karma should start at zero", loggedIn.karma, 0);
  TestValidator.equals(
    "member deletedAt should be null",
    loggedIn.deletedAt,
    null,
  );
  TestValidator.predicate(
    "access token should exist",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should exist",
    loggedIn.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at should be in the future",
    new Date(loggedIn.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refreshable_until should be at or after expired_at",
    new Date(loggedIn.token.refreshable_until).getTime() >=
      new Date(loggedIn.token.expired_at).getTime(),
  );
  const secondLoginConnection: api.IConnection = { host: connection.host };
  const reloggedIn = await authorize_member_login(secondLoginConnection, {
    body: {
      email,
      password,
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(reloggedIn);
  TestValidator.equals(
    "relogin should preserve member id",
    reloggedIn.id,
    joined.id,
  );
  TestValidator.equals(
    "relogin should preserve email",
    reloggedIn.email,
    email,
  );
  TestValidator.equals(
    "relogin should preserve username",
    reloggedIn.username,
    username,
  );
  TestValidator.equals(
    "relogin should preserve display name",
    reloggedIn.displayName,
    displayName,
  );
  TestValidator.predicate(
    "relogin should issue an access token",
    reloggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "relogin should issue a refresh token",
    reloggedIn.token.refresh.length > 0,
  );
  TestValidator.notEquals(
    "relogin should not reuse the previous access token",
    reloggedIn.token.access,
    loggedIn.token.access,
  );
  TestValidator.notEquals(
    "relogin should not reuse the previous refresh token",
    reloggedIn.token.refresh,
    loggedIn.token.refresh,
  );
}
