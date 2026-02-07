import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
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
  // 1. Create a verified member account using authorize_member_join
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!" + RandomGenerator.alphaNumeric(8),
  } satisfies ICommunityMember.IJoin;
  const joined = await authorize_member_join(connection, { body: joinInput });
  typia.assert(joined);
  // 2. Extract credentials for login
  const loginCredentials: ICommunityMember.ILogin = {
    email: joinInput.email,
    password: joinInput.password,
  };
  // 3. Use member-specific connection to authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_member_login(memberConnection, {
    body: loginCredentials,
  });
  typia.assert(loginResponse);
  // 4. Validate token structure: ICommunityMember.IAuthorized
  // Must be exactly: { token: IAuthorizationToken }
  const token = loginResponse.token;
  // Validate IAuthorizationToken structure
  TestValidator.equals(
    "access token exists and is string",
    typeof token.access,
    "string",
  );
  TestValidator.equals(
    "refresh token exists and is string",
    typeof token.refresh,
    "string",
  );
  // Validate date-time formats (ISO 8601)
  const accessExpires = new Date(token.expired_at);
  const refreshUntil = new Date(token.refreshable_until);
  TestValidator.predicate(
    "access token expires in valid ISO date-time format",
    !isNaN(accessExpires.getTime()),
  );
  TestValidator.predicate(
    "refresh token valid until in valid ISO date-time format",
    !isNaN(refreshUntil.getTime()),
  );
  // Confirm we have only the schema-defined structure: no extra properties
  const responseKeys = Object.keys(loginResponse);
  TestValidator.equals("total properties in response", responseKeys.length, 1);
  TestValidator.equals("only property is 'token'", responseKeys[0], "token");
  // Verify the token object has exactly 4 properties (access, refresh, expired_at, refreshable_until)
  const tokenKeys = Object.keys(token);
  TestValidator.equals("total properties in token", tokenKeys.length, 4);
  TestValidator.equals(
    "token has access property",
    tokenKeys.includes("access"),
    true,
  );
  TestValidator.equals(
    "token has refresh property",
    tokenKeys.includes("refresh"),
    true,
  );
  TestValidator.equals(
    "token has expired_at property",
    tokenKeys.includes("expired_at"),
    true,
  );
  TestValidator.equals(
    "token has refreshable_until property",
    tokenKeys.includes("refreshable_until"),
    true,
  );
}
