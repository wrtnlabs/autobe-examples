import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest registration with device fingerprint only.
 * Validates the core anonymous browsing capability that enables guests to access
 * discussion board sections, articles, and comments without email/password credentials.
 */
export async function test_api_guest_join_with_device_fingerprint_only(
  connection: api.IConnection,
): Promise<void> {
  // Create guest-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate device fingerprint for guest registration
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  // Join as guest using device fingerprint only (no display name)
  const authorized: IDiscussionBoardGuest.IAuthorized =
    await authorize_guest_join(guestConnection, {
      body: {
        deviceFingerprint,
      } satisfies IDiscussionBoardGuest.IJoin,
    });
  // Validate response structure
  typia.assert(authorized);
  // Validate guest ID is a valid UUID
  TestValidator.predicate(
    "guest ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );
  // Validate display name is undefined when not provided
  TestValidator.predicate(
    "display name is undefined when not provided",
    authorized.displayName === undefined,
  );
  // Validate token structure exists
  TestValidator.predicate(
    "token has access field",
    () =>
      typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "token has refresh field",
    () =>
      typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  // Validate token expiration timestamps are valid ISO 8601 date-time format
  TestValidator.predicate(
    "expired_at is valid ISO 8601 date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?(?:Z|[+-][0-9]{2}:[0-9]{2})$/i.test(
      authorized.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO 8601 date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?(?:Z|[+-][0-9]{2}:[0-9]{2})$/i.test(
      authorized.token.refreshable_until,
    ),
  );
  // Validate expired_at is in the future
  TestValidator.predicate(
    "expired_at is in the future",
    new Date(authorized.token.expired_at) > new Date(),
  );
  // Validate refreshable_until is after expired_at
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    new Date(authorized.token.refreshable_until) >
      new Date(authorized.token.expired_at),
  );
}