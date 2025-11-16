import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_guest_account_multiple_concurrent_creation(
  connection: api.IConnection,
) {
  // Create multiple guest accounts concurrently to verify system handles concurrent registrations
  // Each guest should receive unique ID and independent token pairs
  const guestCount = 5;

  const guestPromises = ArrayUtil.repeat(guestCount, () =>
    api.functional.auth.guest.join(connection),
  );

  const guests = await Promise.all(guestPromises);

  // Validate each guest account was created successfully
  TestValidator.predicate(
    "all guest accounts created",
    guests.length === guestCount,
  );

  // Verify all guest accounts have the required structure
  guests.forEach((guest) => {
    typia.assert(guest);
  });

  // Verify each guest has unique ID
  const guestIds = guests.map((g) => g.id);
  const uniqueIds = new Set(guestIds);
  TestValidator.equals("all guest IDs are unique", uniqueIds.size, guestCount);

  // Verify each guest has unique access tokens
  const accessTokens = guests.map((g) => g.token.access);
  const uniqueAccessTokens = new Set(accessTokens);
  TestValidator.equals(
    "all access tokens are unique",
    uniqueAccessTokens.size,
    guestCount,
  );

  // Verify each guest has unique refresh tokens
  const refreshTokens = guests.map((g) => g.token.refresh);
  const uniqueRefreshTokens = new Set(refreshTokens);
  TestValidator.equals(
    "all refresh tokens are unique",
    uniqueRefreshTokens.size,
    guestCount,
  );

  // Verify token expiration times are set correctly
  guests.forEach((guest) => {
    TestValidator.predicate(
      `guest ${guest.id} has valid expired_at timestamp`,
      guest.token.expired_at !== null && guest.token.expired_at !== undefined,
    );
    TestValidator.predicate(
      `guest ${guest.id} has valid refreshable_until timestamp`,
      guest.token.refreshable_until !== null &&
        guest.token.refreshable_until !== undefined,
    );
  });

  // Verify session isolation - ensure no cross-contamination between guests
  TestValidator.predicate(
    "all guest sessions maintain isolation with different tokens",
    guests.every((guest, index) => {
      const othersWithDifferentTokens = guests.filter(
        (g, idx) => idx !== index && g.token.access !== guest.token.access,
      );
      return othersWithDifferentTokens.length === guestCount - 1;
    }),
  );
}
