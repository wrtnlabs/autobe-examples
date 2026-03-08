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
  // Test successful member login with valid credentials after registration.
  //
  // Scenario Flow:
  // 1. A new member registers via the join endpoint with valid credentials
  // 2. The member logs in with the same credentials
  // 3. Validate the login response contains valid tokens and profile data
  // Step 1: Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const username = RandomGenerator.alphaNumeric(8);
  const joinResponse = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      username,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
      href: "https://example.com/login",
      referrer: "https://example.com/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResponse);
  // Step 2: Login with the registered credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_member_login(loginConnection, {
    body: {
      email,
      password,
      href: "https://example.com/dashboard",
      referrer: "https://example.com/login",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(loginResponse);
  // Step 3: Validate login response
  // Validate tokens exist and are non-empty strings
  TestValidator.predicate(
    "access token exists",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    loginResponse.token.refresh.length > 0,
  );
  // Validate token expiration timestamps are set
  TestValidator.predicate(
    "access token expiration is valid",
    new Date(loginResponse.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refresh token expiration is valid",
    new Date(loginResponse.token.refreshable_until) > new Date(),
  );
  TestValidator.predicate(
    "refresh token expires after access token",
    new Date(loginResponse.token.refreshable_until) >
      new Date(loginResponse.token.expired_at),
  );
  // Validate profile data accuracy
  TestValidator.equals("username matches", loginResponse.username, username);
  TestValidator.equals("karma is zero for new member", loginResponse.karma, 0);
  TestValidator.equals("member id matches", loginResponse.id, joinResponse.id);
  TestValidator.equals(
    "member username matches",
    loginResponse.member.username,
    username,
  );
  // Validate member profile in response
  TestValidator.equals(
    "member display name",
    loginResponse.member.display_name,
    loginResponse.displayName,
  );
  TestValidator.equals("member karma", loginResponse.member.karma, 0);
}
