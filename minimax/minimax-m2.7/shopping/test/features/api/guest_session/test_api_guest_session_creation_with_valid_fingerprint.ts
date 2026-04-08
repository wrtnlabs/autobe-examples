import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest session creation with valid device fingerprint.
 *
 * Validates the guest authentication flow where unauthenticated visitors can
 * create a session by providing a device fingerprint. The system creates a
 * guest record in the database and returns JWT tokens for session management.
 *
 * This test verifies the business logic of token expiration:
 * - Token expiration timestamps are valid future dates
 * - Refresh token outlasts access token (refreshable_until > expired_at)
 *
 * 1. Generate valid fingerprint, href, and referrer data.
 * 2. Call POST /ecommerceMall/auth/guest/join endpoint.
 * 3. Validate response structure with typia.assert().
 * 4. Verify token expiration timestamps are valid business rules.
 */
export async function test_api_guest_session_creation_with_valid_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate valid fingerprint data
  const fingerprint = RandomGenerator.alphaNumeric(32) as string &
    tags.MinLength<1>;
  const href = "https://example.com/products";
  const referrer = "https://search.example.com";
  // 2. Call the guest join endpoint using utility function
  const result = await authorize_guest_join(connection, {
    body: {
      fingerprint,
      href,
      referrer,
    },
  });
  // 3. Validate response structure - typia.assert performs complete type validation
  typia.assert(result);
  // 4. Verify business logic: token expiration timestamps
  const now = new Date();
  const expiredAt = new Date(result.token.expired_at);
  const refreshableUntil = new Date(result.token.refreshable_until);
  TestValidator.predicate("expired_at is a valid future date", expiredAt > now);
  TestValidator.predicate(
    "refreshable_until is a valid future date",
    refreshableUntil > now,
  );
  // Refresh token must outlive access token
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil > expiredAt,
  );
}
