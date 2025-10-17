import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthRefresh";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test token refresh workflow for moderators.
 *
 * 1. Register a new moderator account by calling join API.
 * 2. Use the refresh API with the refresh token from join.
 * 3. Validate that new tokens are received and are different.
 * 4. Validate that moderator identity is preserved.
 * 5. Validate timestamps and token fields have correct formats.
 */
export async function test_api_moderator_token_refresh(
  connection: api.IConnection,
) {
  // 1. Register a new moderator account
  const moderatorCreateBody = {
    email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const joinedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join.joinModerator(connection, {
      body: moderatorCreateBody,
    });
  typia.assert(joinedModerator);

  // 2. Refresh tokens using the refresh token from join response
  const refreshBody = {
    refreshToken: joinedModerator.token.refresh,
  } satisfies IAuthRefresh;
  const refreshedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.refresh.refreshModerator(connection, {
      body: refreshBody,
    });
  typia.assert(refreshedModerator);

  // 3. Validate tokens and identity preservation
  TestValidator.predicate(
    "Refresh should return different access token",
    refreshedModerator.token.access !== joinedModerator.token.access,
  );
  TestValidator.predicate(
    "Refresh should return different refresh token",
    refreshedModerator.token.refresh !== joinedModerator.token.refresh,
  );
  TestValidator.equals(
    "ID should remain same",
    refreshedModerator.id,
    joinedModerator.id,
  );
  TestValidator.equals(
    "Email should remain same",
    refreshedModerator.email,
    joinedModerator.email,
  );
  TestValidator.equals(
    "Display name should remain same",
    refreshedModerator.display_name,
    joinedModerator.display_name,
  );

  // 4. Validate timestamp formats
  TestValidator.predicate(
    "created_at is ISO 8601 date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
      refreshedModerator.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
      refreshedModerator.updated_at,
    ),
  );
}
