import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";
import type { ITodoListMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_token_refresh(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account to obtain initial refresh token
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinResponse = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    },
  });
  typia.assert(memberJoinResponse);
  // Step 2: Authenticate member to obtain valid refresh token for the refresh operation
  const loginConnection: api.IConnection = { host: connection.host };
  const memberLoginResponse = await authorize_member_login(loginConnection, {
    body: {
      email: memberEmail, // Use original email stored from join
      password: memberPassword, // Use original password stored from join
    },
  });
  typia.assert(memberLoginResponse);
  // Validate token structure from login
  TestValidator.equals(
    "login has access token",
    typeof memberLoginResponse.token.access,
    "string",
  );
  TestValidator.equals(
    "login has refresh token",
    typeof memberLoginResponse.token.refresh,
    "string",
  );
  TestValidator.equals(
    "login has expired_at",
    typeof memberLoginResponse.token.expired_at,
    "string",
  );
  TestValidator.equals(
    "login has refreshable_until",
    typeof memberLoginResponse.token.refreshable_until,
    "string",
  );
  // Step 3: Use the refresh token to request a new token pair
  const refreshConnection: api.IConnection = { host: connection.host };
  const memberRefreshResponse = await authorize_member_refresh(
    refreshConnection,
    {
      body: {
        refreshToken: memberLoginResponse.token.refresh,
      },
    },
  );
  typia.assert(memberRefreshResponse);
  // Step 4: Validate that new tokens are issued correctly
  TestValidator.notEquals(
    "new access token differs from old access token",
    memberRefreshResponse.token.access,
    memberLoginResponse.token.access,
  );
  TestValidator.notEquals(
    "new refresh token differs from old refresh token",
    memberRefreshResponse.token.refresh,
    memberLoginResponse.token.refresh,
  );
  TestValidator.predicate(
    "new access token expires after old access token",
    new Date(memberRefreshResponse.token.expired_at) >
      new Date(memberLoginResponse.token.expired_at),
  );
  TestValidator.predicate(
    "new refresh token is refreshable after old refresh token",
    new Date(memberRefreshResponse.token.refreshable_until) >
      new Date(memberLoginResponse.token.refreshable_until),
  );
  // Step 5: Verify that the previous refresh token is invalidated by attempting to reuse it
  // Create a fresh connection for this test to ensure no cached state
  const invalidationConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "previous refresh token should be invalidated",
    async () => {
      await authorize_member_refresh(invalidationConnection, {
        body: {
          refreshToken: memberLoginResponse.token.refresh,
        },
      });
    },
  );
}
