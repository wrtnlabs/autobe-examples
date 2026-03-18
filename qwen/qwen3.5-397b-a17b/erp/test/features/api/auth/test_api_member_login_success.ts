import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
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
  // 1. Create a new member account for login testing
  const joinCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    avatar_url: typia.random<(string & tags.Format<"uri">) | null>(),
    phone_number: RandomGenerator.mobile(),
    ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
  } satisfies IHrmPlatformMember.IJoin;
  // Register the member using utility function
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: joinCredentials,
  });
  typia.assert(joinResult);
  // 2. Verify join response structure
  TestValidator.equals(
    "join email matches",
    joinResult.email,
    joinCredentials.email,
  );
  TestValidator.equals(
    "join display name matches",
    joinResult.displayName,
    joinCredentials.display_name,
  );
  TestValidator.predicate(
    "join has access token",
    joinResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "join has refresh token",
    joinResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "join expired_at is valid date",
    new Date(joinResult.token.expired_at).getTime() > 0,
  );
  TestValidator.predicate(
    "join refreshable_until is valid date",
    new Date(joinResult.token.refreshable_until).getTime() > 0,
  );
  // 3. Login with the same credentials using a new connection
  const loginIp = typia.random<(string & tags.Format<"ipv4">) | null>();
  const loginCredentials = {
    email: joinCredentials.email,
    password: joinCredentials.password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: loginIp ?? undefined,
  } satisfies IHrmPlatformMember.ILogin;
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: loginCredentials,
  });
  typia.assert(loginResult);
  // 4. Verify login response structure
  TestValidator.equals(
    "login email matches",
    loginResult.email,
    loginCredentials.email,
  );
  TestValidator.equals(
    "login display name matches",
    loginResult.displayName,
    joinCredentials.display_name,
  );
  TestValidator.predicate(
    "login has access token",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "login has refresh token",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "login expired_at is valid date",
    new Date(loginResult.token.expired_at).getTime() > 0,
  );
  TestValidator.predicate(
    "login refreshable_until is valid date",
    new Date(loginResult.token.refreshable_until).getTime() > 0,
  );
  // 5. Verify member profile consistency between join and login
  TestValidator.equals("member id consistent", loginResult.id, joinResult.id);
  TestValidator.equals(
    "member email consistent",
    loginResult.email,
    joinResult.email,
  );
  TestValidator.equals(
    "member display name consistent",
    loginResult.displayName,
    joinResult.displayName,
  );
  TestValidator.equals(
    "member avatar URL consistent",
    loginResult.avatarUrl,
    joinResult.avatarUrl,
  );
  TestValidator.equals(
    "member phone number consistent",
    loginResult.phoneNumber,
    joinCredentials.phone_number,
  );
  // 6. Verify token structure is different (new session created)
  TestValidator.notEquals(
    "access token differs",
    loginResult.token.access,
    joinResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token differs",
    loginResult.token.refresh,
    joinResult.token.refresh,
  );
  // 7. Verify member summary data
  TestValidator.equals(
    "member summary id matches",
    loginResult.member.id,
    loginResult.id,
  );
  TestValidator.equals(
    "member summary email matches",
    loginResult.member.email,
    loginResult.email,
  );
  TestValidator.equals(
    "member summary display name matches",
    loginResult.member.display_name,
    loginResult.displayName,
  );
}