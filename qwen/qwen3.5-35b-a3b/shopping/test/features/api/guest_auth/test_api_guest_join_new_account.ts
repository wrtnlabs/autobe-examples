import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
export async function test_api_guest_join_new_account(connection: api.IConnection): Promise<void> {
  /**
   * Test the primary success path for new guest registration.
   *
   * Validates the complete guest registration flow including device fingerprint creation,
   * session establishment with IP and referrer tracking, and JWT token generation.
   * Tests both new guest registration and existing guest session continuation scenarios.
   *
   * Special attention is given to verifying that the access and refresh tokens are
   * properly generated with appropriate expiration times, and that the guest ID remains
   * consistent across multiple requests from the same device fingerprint.
   *
   * 1. Generate random guest registration data with unique fingerprint, valid IP, and href.
   * 2. Register new guest using authorize_guest_join utility function.
   * 3. Validate HTTP 201 response with valid JWT tokens and expiration timestamps.
   * 4. Verify guest ID is UUID format and tokens are valid JWT strings.
   * 5. Test duplicate fingerprint returns same guest ID (session continuation).
   * 6. Use access token from first registration for subsequent authenticated request.
   */

  // Generate random guest registration data
  const fingerprint = RandomGenerator.alphaNumeric(16);
  const href = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Step 1: Register new guest
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_guest_join(joinConnection, {
    body: {
      fingerprint,
      href,
      ip,
      referrer,
    } satisfies IEcommerceMallGuest.IJoin,
  });
  typia.assert(joinResult);

  // Step 2: Validate new guest registration response
  TestValidator.predicate("guest ID is UUID format", /^[0-9a-f-]{36}$/i.test(joinResult.id));
  TestValidator.predicate("access token is valid JWT format", joinResult.token.access.split(".").length === 3);
  TestValidator.predicate("refresh token is valid JWT format", joinResult.token.refresh.split(".").length === 3);
  TestValidator.predicate("expired_at timestamp exists", joinResult.token.expired_at !== undefined);
  TestValidator.predicate("refreshable_until timestamp exists", joinResult.token.refreshable_until !== undefined);

  // Step 3: Verify token expiration times are set (approximately 24 hours)
  const expiredAt = new Date(joinResult.token.expired_at);
  const refreshableUntil = new Date(joinResult.token.refreshable_until);
  const now = new Date();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  TestValidator.predicate("expired_at is in future", expiredAt > now);
  TestValidator.predicate(
    "expired_at is approximately 24 hours from now",
    Math.abs(expiredAt.getTime() - now.getTime() - twentyFourHours) < 5 * 60 * 1000,
  );
  TestValidator.predicate("refreshable_until is after expired_at", refreshableUntil > expiredAt);

  // Step 4: Test duplicate fingerprint (session continuation for existing guest)
  const continuationConnection: api.IConnection = { host: connection.host };
  const continuationResult = await authorize_guest_join(continuationConnection, {
    body: {
      fingerprint,
      href: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallGuest.IJoin,
  });
  typia.assert(continuationResult);

  // Verify same guest ID returned for duplicate fingerprint
  TestValidator.equals(
    "same guest ID for duplicate fingerprint registration",
    joinResult.id,
    continuationResult.id,
  );

  // Verify new session tokens were issued
  TestValidator.notEquals(
    "different session tokens for renewed session",
    joinResult.token.access,
    continuationResult.token.access,
  );

  // Step 5: Verify connection headers updated with auth token
  TestValidator.predicate(
    "connection has authorization header updated",
    joinConnection.headers?.authorization !== undefined,
  );
  TestValidator.equals(
    "authorization header contains Bearer token",
    joinConnection.headers?.authorization,
    `Bearer ${joinResult.token.access}`,
  );
}