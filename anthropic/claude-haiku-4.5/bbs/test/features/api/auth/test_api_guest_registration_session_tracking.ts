import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_guest_registration_session_tracking(
  connection: api.IConnection,
) {
  // Step 1: Register a guest account via the join endpoint
  const guestResponse: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.guest.join(connection);

  // Validate the complete response structure and all type constraints
  typia.assert(guestResponse);

  // Step 2: Verify that authorization token was properly set in connection headers
  // This is a business logic validation: SDK should automatically set Authorization header
  TestValidator.equals(
    "Authorization header should be set to Bearer token",
    connection.headers?.Authorization,
    `Bearer ${guestResponse.token.access}`,
  );

  // Step 3: Verify token expiration ordering (access token expires before refresh token)
  // This is a business logic validation: access tokens should be shorter-lived than refresh tokens
  const accessTokenExpiry = new Date(guestResponse.token.expired_at);
  const refreshTokenExpiry = new Date(guestResponse.token.refreshable_until);

  TestValidator.predicate(
    "access token should expire before refresh token",
    accessTokenExpiry < refreshTokenExpiry,
  );

  // Step 4: Verify tokens are not already expired
  // This is a business logic validation: issued tokens should have future expiration times
  const now = new Date();

  TestValidator.predicate(
    "access token should not be already expired",
    accessTokenExpiry > now,
  );

  TestValidator.predicate(
    "refresh token should not be already expired",
    refreshTokenExpiry > now,
  );

  // Step 5: Verify guest session is created with valid session identifier
  // The guest ID represents a temporary session identifier for analytics and security tracking
  TestValidator.predicate(
    "guest session should have valid identifier",
    guestResponse.id.length > 0,
  );
}
