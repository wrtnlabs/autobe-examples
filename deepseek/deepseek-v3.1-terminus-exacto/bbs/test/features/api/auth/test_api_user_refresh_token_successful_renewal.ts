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
 * Test the successful refresh token operation where a user obtains new access tokens using a valid refresh token.
 * This scenario validates that the refresh token mechanism works correctly by:
 * 1. Creating a new user account via join operation to establish an initial session
 * 2. Using the refresh token from the initial authentication to request new tokens
 * 3. Verifying that new access and refresh tokens are generated
 * 4. Ensuring the new tokens have updated expiration timestamps
 * 5. Confirming that the user profile information is correctly returned
 */
export async function test_api_user_refresh_token_successful_renewal(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create initial user session with valid refresh token
  const userConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(initialAuth);
  // Step 2: Use the refresh token to obtain new tokens
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_user_refresh(refreshConnection, {
    body: {
      refresh_token: initialAuth.token.refresh,
    } satisfies IDiscussionBoardUser.IRefresh,
  });
  typia.assert(refreshedAuth);
  // Step 3: Validate token rotation - new tokens should be different
  TestValidator.notEquals(
    "access token should be renewed",
    initialAuth.token.access,
    refreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be renewed",
    initialAuth.token.refresh,
    refreshedAuth.token.refresh,
  );
  // Step 4: Validate token expiration timestamps are updated (using proper Date comparison)
  const initialExpiredAt = new Date(initialAuth.token.expired_at);
  const refreshedExpiredAt = new Date(refreshedAuth.token.expired_at);
  const initialRefreshableUntil = new Date(initialAuth.token.refreshable_until);
  const refreshedRefreshableUntil = new Date(
    refreshedAuth.token.refreshable_until,
  );
  TestValidator.predicate(
    "expired_at should be updated",
    refreshedExpiredAt > initialExpiredAt,
  );
  TestValidator.predicate(
    "refreshable_until should be updated",
    refreshedRefreshableUntil > initialRefreshableUntil,
  );
  // Step 5: Validate user identity remains consistent
  TestValidator.equals(
    "user ID should match",
    refreshedAuth.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "email should match",
    refreshedAuth.email,
    initialAuth.email,
  );
  TestValidator.equals(
    "display name should match",
    refreshedAuth.display_name,
    initialAuth.display_name,
  );
  TestValidator.equals("bio should match", refreshedAuth.bio, initialAuth.bio);
  // Step 6: Validate connection headers are properly updated
  TestValidator.predicate(
    "user connection should have Authorization header",
    userConnection.headers?.Authorization !== undefined,
  );
  TestValidator.predicate(
    "refresh connection should have Authorization header",
    refreshConnection.headers?.Authorization !== undefined,
  );
  TestValidator.notEquals(
    "Authorization headers should be different",
    userConnection.headers?.Authorization,
    refreshConnection.headers?.Authorization,
  );
}
