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
  // 1. Register new member account with valid credentials
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityMember.IJoin;
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(joinConnection, {
    body: joinInput,
  });
  typia.assert(joinResponse);
  // 2. Login with the same credentials used during registration
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_member_login(loginConnection, {
    body: {
      email: joinInput.email,
      password: joinInput.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.ILogin,
  });
  typia.assert(loginResponse);
  // 3. Validate login response structure and business logic
  TestValidator.equals(
    "member id matches registration",
    loginResponse.id,
    joinResponse.id,
  );
  TestValidator.equals(
    "email matches registered email",
    loginResponse.email,
    joinInput.email,
  );
  TestValidator.equals(
    "username matches registered username",
    loginResponse.username,
    joinInput.username,
  );
  TestValidator.equals(
    "created_at matches registration",
    loginResponse.created_at,
    joinResponse.created_at,
  );
  TestValidator.equals(
    "updated_at matches registration",
    loginResponse.updated_at,
    joinResponse.updated_at,
  );
  TestValidator.equals(
    "deleted_at is null for active account",
    loginResponse.deleted_at,
    null,
  );
  TestValidator.predicate(
    "access token is non-empty string",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expires in future",
    new Date(loginResponse.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is after access token expiry",
    new Date(loginResponse.token.refreshable_until) >
      new Date(loginResponse.token.expired_at),
  );
  TestValidator.predicate(
    "access token is valid JWT format",
    /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/.test(
      loginResponse.token.access,
    ),
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    loginResponse.token.refresh.length > 0,
  );
}
