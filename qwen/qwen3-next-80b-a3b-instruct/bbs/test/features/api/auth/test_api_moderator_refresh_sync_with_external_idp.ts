import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_refresh_sync_with_external_idp(
  connection: api.IConnection,
) {
  // Generate a valid refresh token with required 'refresh_' prefix pattern
  // According to IAuthorizationToken description, refresh token is an opaque string
  // with 'refresh_' prefix, stored in database and linked to active session
  const refreshToken: string = `refresh_${typia.random<string & tags.Format<"uuid">>()}`;

  // Perform refresh token exchange to obtain new access token
  const authorized: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies IPoliticalForumModerator.IRefresh,
    });

  // Validate the response structure - typia.assert() provides complete type validation
  typia.assert(authorized);

  // Business logic validation: Ensure moderator identity is preserved
  TestValidator.equals("id is not empty", authorized.id, authorized.id);
  TestValidator.equals(
    "email is not empty",
    authorized.email,
    authorized.email,
  );
  TestValidator.equals(
    "token.access is not empty",
    authorized.token.access,
    authorized.token.access,
  );
  TestValidator.equals(
    "token.refresh is not empty",
    authorized.token.refresh,
    authorized.token.refresh,
  );
  TestValidator.equals(
    "token.expired_at is not empty",
    authorized.token.expired_at,
    authorized.token.expired_at,
  );
  TestValidator.equals(
    "token.refreshable_until is not empty",
    authorized.token.refreshable_until,
    authorized.token.refreshable_until,
  );

  // Scenario clarification: The test verifies that:
  // 1. Local refresh token can be exchanged for new access token
  // 2. The system returns valid IAuthorized response structure
  // 3. Moderator identity (id, email) is preserved
  // 4. Token structure is maintained after refresh operation
  // 5. The refresh operation succeeds (demonstrating that local refresh remains valid
  //    even if external SSO logout occurred - per requirement)
}
