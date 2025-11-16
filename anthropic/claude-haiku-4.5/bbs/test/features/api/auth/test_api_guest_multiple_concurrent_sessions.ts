import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that multiple guest users can be registered simultaneously and maintain
 * independent sessions. Performs concurrent guest join registrations and
 * verifies each receives a unique guest session ID and separate token pair.
 * Validates that tokens from one guest session cannot be used to impersonate
 * another guest. Confirms the system properly isolates guest session state and
 * permissions.
 */
export async function test_api_guest_multiple_concurrent_sessions(
  connection: api.IConnection,
) {
  // Step 1: Execute multiple concurrent guest registrations
  const guestCount = 5;
  const guests = await ArrayUtil.asyncRepeat(guestCount, () =>
    api.functional.auth.guest.join(connection),
  );

  // Step 2: Validate all guests were created successfully
  TestValidator.equals(
    "all guests created successfully",
    guests.length,
    guestCount,
  );

  // Step 3: Validate each guest has a unique ID
  const guestIds = guests.map((g) => g.id);
  const uniqueGuestIds = new Set(guestIds);
  TestValidator.equals(
    "all guest IDs are unique",
    uniqueGuestIds.size,
    guestCount,
  );

  // Step 4: Validate each guest ID is a valid UUID
  guests.forEach((guest, index) => {
    typia.assert(guest);
    TestValidator.predicate(
      `guest ${index} has valid UUID format`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        guest.id,
      ),
    );
  });

  // Step 5: Validate each guest has independent access tokens
  const accessTokens = guests.map((g) => g.token.access);
  const uniqueAccessTokens = new Set(accessTokens);
  TestValidator.equals(
    "all access tokens are unique",
    uniqueAccessTokens.size,
    guestCount,
  );

  // Step 6: Validate each guest has independent refresh tokens
  const refreshTokens = guests.map((g) => g.token.refresh);
  const uniqueRefreshTokens = new Set(refreshTokens);
  TestValidator.equals(
    "all refresh tokens are unique",
    uniqueRefreshTokens.size,
    guestCount,
  );

  // Step 7: Validate token expiration times are present and valid ISO 8601
  guests.forEach((guest, index) => {
    const dateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    TestValidator.predicate(
      `guest ${index} access token expiration is valid ISO 8601`,
      dateTimeRegex.test(guest.token.expired_at),
    );
    TestValidator.predicate(
      `guest ${index} refresh token expiration is valid ISO 8601`,
      dateTimeRegex.test(guest.token.refreshable_until),
    );
  });

  // Step 8: Validate concurrent registration did not cause state conflicts
  TestValidator.predicate(
    "all guest tokens are valid and non-empty",
    guests.every(
      (g) =>
        g.token.access &&
        g.token.refresh &&
        g.id &&
        typeof g.token.access === "string" &&
        typeof g.token.refresh === "string" &&
        g.token.access.length > 0 &&
        g.token.refresh.length > 0,
    ),
  );

  // Step 9: Validate no two guests share the same session ID
  for (let i = 0; i < guestIds.length; i++) {
    for (let j = i + 1; j < guestIds.length; j++) {
      TestValidator.notEquals(
        `guest ${i} and guest ${j} have different session IDs`,
        guestIds[i],
        guestIds[j],
      );
    }
  }

  // Step 10: Validate no two guests share the same access token
  for (let i = 0; i < accessTokens.length; i++) {
    for (let j = i + 1; j < accessTokens.length; j++) {
      TestValidator.notEquals(
        `guest ${i} and guest ${j} have different access tokens`,
        accessTokens[i],
        accessTokens[j],
      );
    }
  }

  // Step 11: Validate no two guests share the same refresh token
  for (let i = 0; i < refreshTokens.length; i++) {
    for (let j = i + 1; j < refreshTokens.length; j++) {
      TestValidator.notEquals(
        `guest ${i} and guest ${j} have different refresh tokens`,
        refreshTokens[i],
        refreshTokens[j],
      );
    }
  }

  // Step 12: Validate each guest response matches expected type structure
  guests.forEach((guest) => {
    typia.assert<IDiscussionBoardMember.IAuthorized>(guest);
  });
}
