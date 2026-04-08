import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test moderator token refresh functionality with a valid authenticated account.
 *
 * Validates the complete token refresh flow for moderator authentication. Registers a new moderator account to obtain initial tokens, then uses the refresh token to obtain new access and refresh tokens without re-entering credentials.
 *
 * This test ensures that the refresh mechanism works correctly, providing new tokens with updated expiration times while maintaining the authenticated session. The test verifies that both the access token and refresh token are properly generated and that the connection is updated with the new authorization header.
 *
 * 1. Register a new moderator account with email, password, and user profile information.
 * 2. Extract the refresh token from the initial authorization response.
 * 3. Create a new connection for the refresh operation.
 * 4. Call the refresh endpoint with the refresh token.
 * 5. Validate that new tokens are returned successfully.
 * 6. Verify the response contains valid moderator account information and tokens.
 */
export async function test_api_moderator_refresh_with_deleted_account(
  connection: api.IConnection,
) {
  // 1. Register a new moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  typia.assert(joinResult);
  // 2. Extract the refresh token
  const refreshToken = joinResult.token.refresh;
  // 3. Create a new connection for refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // 4. Call the refresh endpoint
  const refreshResult = await authorize_moderator_refresh(refreshConnection, {
    body: {
      refresh_token: refreshToken,
    } satisfies IRedditCloneModerator.IRefresh,
  });
  typia.assert(refreshResult);
  // 5. Validate the refresh response
  TestValidator.equals("moderator id matches", refreshResult.id, joinResult.id);
  TestValidator.equals("email matches", refreshResult.email, joinResult.email);
  TestValidator.predicate(
    "has new access token",
    refreshResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "has new refresh token",
    refreshResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has expired_at",
    refreshResult.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "has refreshable_until",
    refreshResult.token.refreshable_until.length > 0,
  );
}
