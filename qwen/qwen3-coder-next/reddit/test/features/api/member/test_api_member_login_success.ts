import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
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
  // Step 1: Create member account (join)
  const memberConnection: api.IConnection = { host: connection.host };
  const joinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(),
    displayName: RandomGenerator.name(2),
  } satisfies IRedditPlatformMember.IJoin;
  const memberProfile = await authorize_member_join(memberConnection, {
    body: joinData,
  });
  typia.assert(memberProfile);
  // Verify email is verified after join
  TestValidator.equals(
    "email should be verified",
    memberProfile.email_verified,
    true,
  );
  // Step 2: Login with correct credentials
  const loginData = {
    email: memberProfile.email,
    password: joinData.password,
  } satisfies IRedditPlatformMember.ILogin;
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: loginData,
  });
  typia.assert(loginResult);
  // Step 3: Validate login result
  TestValidator.equals("user ID matches", loginResult.id, memberProfile.id);
  TestValidator.equals("email matches", loginResult.email, memberProfile.email);
  TestValidator.equals(
    "username matches",
    loginResult.username,
    memberProfile.username,
  );
  TestValidator.equals(
    "display name matches",
    loginResult.display_name,
    memberProfile.display_name,
  );
  TestValidator.equals("bio matches", loginResult.bio, memberProfile.bio);
  TestValidator.equals(
    "avatar URL matches",
    loginResult.avatar_url,
    memberProfile.avatar_url,
  );
  TestValidator.equals(
    "karma score matches",
    loginResult.karma_score,
    memberProfile.karma_score,
  );
  TestValidator.equals(
    "created at matches",
    loginResult.created_at,
    memberProfile.created_at,
  );
  TestValidator.equals(
    "updated at matches",
    loginResult.updated_at,
    memberProfile.updated_at,
  );
  // Verify token structure
  TestValidator.equals(
    "access token exists",
    typeof loginResult.token.access,
    "string",
  );
  TestValidator.equals(
    "refresh token exists",
    typeof loginResult.token.refresh,
    "string",
  );
  TestValidator.predicate(
    "access token not empty",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token not empty",
    loginResult.token.refresh.length > 0,
  );
  // Verify token expiration timestamps exist and are valid date-time format
  TestValidator.equals(
    "expired_at exists",
    typeof loginResult.token.expired_at,
    "string",
  );
  TestValidator.equals(
    "refreshable_until exists",
    typeof loginResult.token.refreshable_until,
    "string",
  );
  // Verify the connection headers were updated with access token
  TestValidator.predicate("connection has authorization header", () => {
    return (
      loginConnection.headers !== undefined &&
      loginConnection.headers.Authorization === loginResult.token.access
    );
  });
}
