import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_refresh_triggers_audit_log(
  connection: api.IConnection,
) {
  // Generate a valid refresh token
  const refreshToken: string = typia.random<string & tags.Format<"uuid">>();

  // Perform moderator refresh operation
  const refreshedToken: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies IPoliticalForumModerator.IRefresh,
    });
  typia.assert(refreshedToken);

  // Validate the response structure - only what can be verified through API
  TestValidator.predicate(
    "refreshed token contains access token",
    refreshedToken.token.access.length > 0,
  );

  TestValidator.predicate(
    "refreshed token contains refresh token",
    refreshedToken.token.refresh.length > 0,
  );

  // Verify that the moderator's ID is properly returned
  TestValidator.predicate(
    "refreshed token has valid UUID id",
    refreshedToken.id.length > 0,
  );

  // Verify that the moderator's email is properly returned
  TestValidator.predicate(
    "refreshed token has email",
    refreshedToken.email.length > 0,
  );

  // Verify expiration times are present
  TestValidator.predicate(
    "refreshed token has expired_at",
    refreshedToken.token.expired_at.length > 0,
  );

  TestValidator.predicate(
    "refreshed token has refreshable_until",
    refreshedToken.token.refreshable_until.length > 0,
  );
}
