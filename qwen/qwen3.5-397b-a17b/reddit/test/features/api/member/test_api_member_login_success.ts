import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
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
  // 1. Create member account with valid credentials
  const joinCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditCommunityMember.IJoin;
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: joinCredentials,
  });
  typia.assert(joinResult);
  // 2. Login with the same credentials
  const loginCredentials = {
    email: joinCredentials.email,
    password: joinCredentials.password,
  } satisfies IRedditCommunityMember.ILogin;
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: loginCredentials,
  });
  typia.assert(loginResult);
  // 3. Verify login response contains required fields
  TestValidator.equals("member ID matches", loginResult.id, joinResult.id);
  TestValidator.predicate(
    "access token exists",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date",
    new Date(loginResult.token.expired_at).getTime() > 0,
  );
  TestValidator.predicate(
    "refreshable_until is valid date",
    new Date(loginResult.token.refreshable_until).getTime() > 0,
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    new Date(loginResult.token.refreshable_until).getTime() >
      new Date(loginResult.token.expired_at).getTime(),
  );
  // 4. Verify access token can be used for authentication
  // The authorize_member_login function already sets the Authorization header
  // on loginConnection, so we can verify the token is properly formatted
  TestValidator.predicate(
    "Authorization header is set",
    loginConnection.headers?.Authorization !== undefined,
  );
  TestValidator.equals(
    "Authorization header format",
    loginConnection.headers?.Authorization,
    `Bearer ${loginResult.token.access}`,
  );
}
