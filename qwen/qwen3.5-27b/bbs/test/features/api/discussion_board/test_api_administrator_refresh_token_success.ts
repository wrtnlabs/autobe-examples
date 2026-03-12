import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that an administrator can successfully refresh their access token using a valid refresh token.
 * The test registers a new administrator, obtains initial tokens, then refreshes to verify
 * token rotation and updated expiration timestamps.
 */
export async function test_api_administrator_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new administrator account to obtain initial tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const initialAuth: IDiscussionBoardAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardAdministrator.IJoin,
    });
  typia.assert(initialAuth);
  // Store initial tokens for comparison
  const initialAccessToken = initialAuth.token.access;
  const initialRefreshToken = initialAuth.token.refresh;
  const initialExpiredAt = initialAuth.token.expired_at;
  // 2. Create a new connection for the refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // 3. Refresh the access token using the refresh token
  const refreshedAuth: IDiscussionBoardAdministrator.IAuthorized =
    await authorize_administrator_refresh(refreshConnection, {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies IDiscussionBoardAdministrator.IRefresh,
    });
  typia.assert(refreshedAuth);
  // 4. Validate token rotation - new access token should be different
  TestValidator.notEquals(
    "access token should be rotated",
    refreshedAuth.token.access,
    initialAccessToken,
  );
  // 5. Validate token rotation - new refresh token should be different
  TestValidator.notEquals(
    "refresh token should be rotated",
    refreshedAuth.token.refresh,
    initialRefreshToken,
  );
  // 6. Validate that the new access token has updated expiration
  TestValidator.predicate(
    "new access token expiration should be in the future",
    new Date(refreshedAuth.token.expired_at) > new Date(),
  );
  // 7. Validate that the new expiration is different from initial
  TestValidator.notEquals(
    "access token expiration should be updated",
    refreshedAuth.token.expired_at,
    initialExpiredAt,
  );
  // 8. Validate administrator profile information is present
  TestValidator.predicate(
    "administrator id should be present",
    refreshedAuth.id !== undefined && refreshedAuth.id.length > 0,
  );
  TestValidator.equals(
    "email should match initial registration",
    refreshedAuth.email,
    initialAuth.email,
  );
  TestValidator.predicate(
    "grade should be present",
    refreshedAuth.grade !== undefined && refreshedAuth.grade.length > 0,
  );
  // 9. Validate that the new tokens can be used (connection headers are updated)
  TestValidator.predicate(
    "refresh connection should have updated authorization header",
    refreshConnection.headers?.Authorization !== undefined,
  );
}
