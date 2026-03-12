import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that successful login creates a new authentication session with proper token generation.
 * Validates session management and token lifecycle including expiration times and token rotation.
 */
export async function test_api_member_login_session_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const joinConnection: api.IConnection = { host: connection.host };
  const registeredMember = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(registeredMember);
  // Capture credentials for login
  const loginEmail = registeredMember.email;
  const loginPassword = "1234";
  // 2. Login with valid credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const firstLogin = await authorize_member_login(loginConnection, {
    body: {
      email: loginEmail,
      password: loginPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.ILogin,
  });
  typia.assert(firstLogin);
  // 3. Validate JWT tokens exist
  TestValidator.predicate(
    "access token exists",
    firstLogin.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    firstLogin.token.refresh.length > 0,
  );
  // 4. Validate access token expiration (~15 minutes from now)
  const now = new Date();
  const accessTokenExpire = new Date(firstLogin.token.expired_at);
  const accessTimeDiff = accessTokenExpire.getTime() - now.getTime();
  const fifteenMinutes = 15 * 60 * 1000;
  TestValidator.predicate(
    "access token expires in ~15 minutes",
    accessTimeDiff > 10 * 60 * 1000 && accessTimeDiff < 20 * 60 * 1000,
  );
  // 5. Validate refresh token expiration (~7 days from now)
  const refreshTokenExpire = new Date(firstLogin.token.refreshable_until);
  const refreshTimeDiff = refreshTokenExpire.getTime() - now.getTime();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  TestValidator.predicate(
    "refresh token expires in ~7 days",
    refreshTimeDiff > 6 * 24 * 60 * 60 * 1000 &&
      refreshTimeDiff < 8 * 24 * 60 * 60 * 1000,
  );
  // 6. Validate member profile information
  TestValidator.equals("member ID is UUID", typeof firstLogin.id, "string");
  TestValidator.equals(
    "email matches registration",
    firstLogin.email,
    loginEmail,
  );
  TestValidator.equals("username is set", firstLogin.username.length, 8);
  TestValidator.equals(
    "display name is set",
    firstLogin.display_name.length,
    2,
  );
  TestValidator.equals("bio is null", firstLogin.bio, null);
  TestValidator.equals("avatar_uri is null", firstLogin.avatar_uri, null);
  TestValidator.equals("karma starts at 0", firstLogin.karma, 0);
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(new Date(firstLogin.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(new Date(firstLogin.updated_at).getTime()),
  );
  TestValidator.equals(
    "deleted_at is null (active)",
    firstLogin.deleted_at,
    null,
  );
  // 7. Test token rotation: login again and verify new tokens
  const secondLoginConnection: api.IConnection = { host: connection.host };
  const secondLogin = await authorize_member_login(secondLoginConnection, {
    body: {
      email: loginEmail,
      password: loginPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.ILogin,
  });
  typia.assert(secondLogin);
  // 8. Verify new tokens were generated (token rotation)
  TestValidator.notEquals(
    "access token rotated",
    firstLogin.token.access,
    secondLogin.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    firstLogin.token.refresh,
    secondLogin.token.refresh,
  );
  TestValidator.notEquals(
    "expired_at updated",
    firstLogin.token.expired_at,
    secondLogin.token.expired_at,
  );
  TestValidator.notEquals(
    "refreshable_until updated",
    firstLogin.token.refreshable_until,
    secondLogin.token.refreshable_until,
  );
  // 9. Verify member profile remains consistent
  TestValidator.equals("member ID unchanged", secondLogin.id, firstLogin.id);
  TestValidator.equals("email unchanged", secondLogin.email, firstLogin.email);
  TestValidator.equals(
    "username unchanged",
    secondLogin.username,
    firstLogin.username,
  );
}
