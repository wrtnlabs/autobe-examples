import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that moderator registration generates valid JWT tokens with correct
 * claims and expiration.
 *
 * This test validates the complete JWT token generation workflow for moderator
 * registration:
 *
 * 1. Create an administrator account (required for moderator appointment)
 * 2. Register a new moderator account using the administrator's ID
 * 3. Validate JWT token structure and expiration times
 * 4. Verify token expiration times are within expected ranges
 * 5. Confirm tokens are properly differentiated
 *
 * The test ensures that:
 *
 * - Both access and refresh tokens are generated
 * - Access token expires in 30 minutes
 * - Refresh token expires between 7-30 days
 * - Tokens are unique and different from each other
 */
export async function test_api_moderator_registration_generates_valid_jwt_tokens(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for moderator appointment
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
      } satisfies IDiscussionBoardAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Register moderator account using administrator's ID
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const moderatorPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        appointed_by_admin_id: admin.id,
        username: moderatorUsername,
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 3: Validate token structure - typia.assert already validated everything
  const token: IAuthorizationToken = moderator.token;
  typia.assert(token);

  // Step 4: Validate access token expiration (30 minutes)
  const currentTime = new Date();
  const expiredAt = new Date(token.expired_at);
  const accessTokenDurationMinutes =
    (expiredAt.getTime() - currentTime.getTime()) / (1000 * 60);

  TestValidator.predicate(
    "access token expires in approximately 30 minutes",
    accessTokenDurationMinutes >= 29 && accessTokenDurationMinutes <= 31,
  );

  // Step 5: Validate refresh token expiration (7-30 days)
  const refreshableUntil = new Date(token.refreshable_until);
  const refreshTokenDurationDays =
    (refreshableUntil.getTime() - currentTime.getTime()) /
    (1000 * 60 * 60 * 24);

  TestValidator.predicate(
    "refresh token expires between 7 and 30 days",
    refreshTokenDurationDays >= 7 && refreshTokenDurationDays <= 30,
  );

  // Step 6: Verify tokens are different (access != refresh)
  TestValidator.notEquals(
    "access and refresh tokens are different",
    token.access,
    token.refresh,
  );
}
