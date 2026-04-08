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
 * Test that the guest join operation correctly captures browser context
 * information for analytics and session tracking.
 *
 * Validates the complete guest session creation flow including:
 * - Successful JWT token generation with access and refresh tokens
 * - Session ID creation in UUID format
 * - Navigation context capture (href, referrer) for analytics
 * - Device fingerprint association
 * - Token expiration timestamps validation
 *
 * 1. Submit POST request to /ecommerceMall/auth/guest/join with specific
 *    navigation context (fingerprint, href, referrer).
 * 2. Verify response returns valid JWT tokens (access, refresh, expiration).
 * 3. Validate the authorization response structure with typia.assert().
 * 4. Verify token expiration timestamps are valid ISO date-time formats.
 * 5. Validate business logic: tokens exist, session ID is valid UUID format.
 */
export async function test_api_guest_session_navigation_context_capture(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session with navigation context using utility function
  const output = await authorize_guest_join(connection, {
    body: {
      fingerprint: "analytics-test-fingerprint" as string & tags.MinLength<1>,
      href: "https://example.com/products/category/electronics" as string &
        tags.Format<"uri">,
      referrer: "https://google.com/search?q=laptop" as string &
        tags.Format<"uri">,
    },
  });
  // 2. Validate complete response structure with typia.assert()
  typia.assert(output);
  // 3. Validate business logic - session ID exists and is valid UUID
  TestValidator.predicate(
    "session ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      output.id,
    ),
  );
  // 4. Validate JWT tokens exist and are non-empty
  TestValidator.predicate(
    "access token exists",
    output.token.access !== undefined && output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    output.token.refresh !== undefined && output.token.refresh.length > 0,
  );
  // 5. Validate expiration timestamps are valid and in the future
  const now = new Date();
  const expiredAt = new Date(output.token.expired_at);
  const refreshableUntil = new Date(output.token.refreshable_until);
  TestValidator.predicate(
    "access token expiration is in the future",
    expiredAt > now,
  );
  TestValidator.predicate(
    "refresh token expiration is in the future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil > expiredAt,
  );
  // 6. Validate timestamps in response are valid ISO date-time
  TestValidator.predicate(
    "createdAt is valid date-time",
    !isNaN(Date.parse(output.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is valid date-time",
    !isNaN(Date.parse(output.updatedAt)),
  );
}
