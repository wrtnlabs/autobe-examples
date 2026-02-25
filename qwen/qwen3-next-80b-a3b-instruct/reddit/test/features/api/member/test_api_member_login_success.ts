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
  // Create verified member account for login
  const joinConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(),
  } satisfies IRedditCommunityMember.IJoin;
  const joined = await authorize_member_join(joinConnection, {
    body: joinInput,
  });
  typia.assert(joined);
  // Login with valid credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginInput = {
    email: joinInput.email,
    password: joinInput.password,
  } satisfies IRedditCommunityMember.ILogin;
  const loggedin = await authorize_member_login(loginConnection, {
    body: loginInput,
  });
  typia.assert(loggedin);
  // Validate authentication response structure
  TestValidator.equals("user id matches", loggedin.id, joined.id);
  TestValidator.equals(
    "username matches",
    loggedin.username,
    joinInput.username,
  );
  TestValidator.equals(
    "display name matches",
    loggedin.display_name,
    joinInput.displayName,
  );
  TestValidator.predicate(
    "karma score is int32",
    Number.isInteger(loggedin.karma_score),
  );
  TestValidator.predicate("access token exists", loggedin.access !== "");
  TestValidator.predicate("refresh token exists", loggedin.refresh !== "");
  TestValidator.equals("email is null in response", loggedin.email, null);
  TestValidator.equals(
    "created_at matches",
    loggedin.created_at,
    joined.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    loggedin.updated_at,
    joined.updated_at,
  );
  TestValidator.equals("is_deleted is false", loggedin.is_deleted, false);
  // Verify token structure
  TestValidator.equals(
    "access token exists in token",
    loggedin.token.access,
    loggedin.access,
  );
  TestValidator.equals(
    "refresh token exists in token",
    loggedin.token.refresh,
    loggedin.refresh,
  );
  TestValidator.predicate(
    "expired_at is date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      loggedin.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      loggedin.token.refreshable_until,
    ),
  );
  // Test session invalidation: login again to invalidate previous session
  const secondLoginConnection: api.IConnection = { host: connection.host };
  const secondLoggedin = await authorize_member_login(secondLoginConnection, {
    body: loginInput,
  });
  typia.assert(secondLoggedin);
  // Verify new tokens are issued
  TestValidator.notEquals(
    "new access token different",
    loggedin.access,
    secondLoggedin.access,
  );
  TestValidator.notEquals(
    "new refresh token different",
    loggedin.refresh,
    secondLoggedin.refresh,
  );
  // Ensure all fields from IAuthorized are present
  // Note: All required fields were already validated above
}
