import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for member registration
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate email and password for registration
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = typia.random<string & tags.MinLength<8>>();
  // Step 2: Register a new member using the authorization utility function
  const memberInfo = await authorize_member_join(memberConnection, {
    body: {
      email: testEmail,
      password: testPassword,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberInfo);
  // Step 3: Create a new connection for member login using the registered member's credentials
  const loginConnection: api.IConnection = { host: connection.host };
  // Step 4: Authenticate the member using the authorization utility function with stored credentials
  const authenticatedMember = await authorize_member_login(loginConnection, {
    body: {
      email: testEmail,
      password: testPassword,
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(authenticatedMember);
  // Step 5: Validate the response structure matches ICommunityPlatformMember.IAuthorized
  TestValidator.equals(
    "member_id is a valid UUID",
    authenticatedMember.member_id,
    memberInfo.member_id,
  );
  TestValidator.equals(
    "username matches registered username",
    authenticatedMember.username,
    memberInfo.username,
  );
  TestValidator.equals(
    "display_name matches registered display name",
    authenticatedMember.display_name,
    memberInfo.display_name,
  );
  TestValidator.equals(
    "karma is 0 for new member",
    authenticatedMember.karma,
    0,
  );
  // Validate that access_token and refresh_token exist and are not empty
  typia.assertGuard(authenticatedMember.token.access);
  typia.assertGuard(authenticatedMember.token.refresh);
  // Validate token expiration times
  typia.assertGuard(authenticatedMember.token.expired_at);
  typia.assertGuard(authenticatedMember.token.refreshable_until);
}
