import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
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
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const joinConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformMember.IJoin;
  const joined: ICommunityPlatformMember.IAuthorized = typia.assert(
    await authorize_member_join(joinConnection, {
      body: joinBody,
    }),
  );
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformMember.ILogin;
  const loggedIn: ICommunityPlatformMember.IAuthorized = typia.assert(
    await authorize_member_login(loginConnection, {
      body: loginBody,
    }),
  );
  TestValidator.equals(
    "join connection authorization header matches join token",
    joinConnection.headers?.Authorization,
    joined.token.access,
  );
  TestValidator.equals(
    "member id remains the same account",
    loggedIn.id,
    joined.id,
  );
  TestValidator.equals(
    "member code remains the same account",
    loggedIn.code,
    joined.code,
  );
  TestValidator.equals(
    "member email remains the same account",
    loggedIn.email,
    joined.email,
  );
  TestValidator.equals("login uses requested email", loggedIn.email, email);
  TestValidator.equals(
    "member status remains unchanged across login",
    loggedIn.status,
    joined.status,
  );
  TestValidator.equals(
    "email verification state remains unchanged across login",
    loggedIn.emailVerified,
    joined.emailVerified,
  );
  TestValidator.notEquals(
    "fresh access token is issued for login",
    loggedIn.token.access,
    joined.token.access,
  );
  TestValidator.notEquals(
    "fresh refresh token is issued for login",
    loggedIn.token.refresh,
    joined.token.refresh,
  );
  TestValidator.equals(
    "login connection authorization header matches new access token",
    loginConnection.headers?.Authorization,
    loggedIn.token.access,
  );
  TestValidator.predicate(
    "access token is non-empty",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    loggedIn.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "session expiration metadata is present",
    loggedIn.token.expired_at.length > 0 &&
      loggedIn.token.refreshable_until.length > 0,
  );
}
