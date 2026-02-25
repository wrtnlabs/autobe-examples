import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test successful user registration on the discussion board platform.
 *
 * Verifies that a new user can register with valid credentials and receive:
 * 1. Valid JWT tokens (access and refresh)
 * 2. Correct token expiration timestamps
 * 3. User profile with default values (MEMBER permission, zero counts)
 * 4. Matching email and display name
 */
export async function test_api_user_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Prepare test data with password meeting security requirements:
  // min 8 chars, uppercase, lowercase, number, special character
  const email = typia.random<string & tags.Format<"email">>();
  const displayName = RandomGenerator.name();
  const password = "TestPass123!";
  const joinInput = {
    email,
    password,
    displayName,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardUser.IJoin;
  // Create user-specific connection and execute join
  const userConnection: api.IConnection = { host: connection.host };
  const result = await authorize_user_join(userConnection, {
    body: joinInput,
  });
  typia.assert(result);
  // Validate user profile matches input
  TestValidator.equals("email matches", result.email, email);
  TestValidator.equals("display name matches", result.displayName, displayName);
  TestValidator.equals(
    "permission level is MEMBER",
    result.permission_level,
    "MEMBER",
  );
  TestValidator.equals("article count is zero", result.articleCount, 0);
  TestValidator.equals("comment count is zero", result.commentCount, 0);
  // Validate tokens exist and are non-empty strings
  TestValidator.predicate(
    "access token exists",
    result.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    result.token.refresh.length > 0,
  );
  // Validate expiration timestamps are in the future
  const now = new Date();
  const expiredAt = new Date(result.token.expired_at);
  const refreshableUntil = new Date(result.token.refreshable_until);
  TestValidator.predicate(
    "access token expiration is in future",
    expiredAt > now,
  );
  TestValidator.predicate(
    "refresh token expiration is in future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refresh expires after access",
    refreshableUntil > expiredAt,
  );
  // Validate connection headers are set with access token for authenticated calls
  TestValidator.predicate(
    "user connection has authorization header",
    userConnection.headers?.Authorization !== undefined,
  );
}
