import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest session reconnection with same device fingerprint.
 *
 * Scenario: Call join twice with the same device fingerprint from the same client,
 * verify the system links to the existing guest record instead of creating a duplicate.
 * Both calls should return valid sessions, and the guest ID should remain consistent
 * across calls with the same fingerprint.
 */
export async function test_api_guest_session_reconnection_with_same_device(
  connection: api.IConnection,
): Promise<void> {
  // Generate a consistent device fingerprint for the test
  const fingerprint = RandomGenerator.alphaNumeric(32);
  // First join - should create a new guest session
  const firstSession = await api.functional.redditClone.auth.guest.join(
    connection,
    {
      body: {
        fingerprint: fingerprint,
        href: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCloneGuestSession.IJoin,
    },
  );
  typia.assert(firstSession);
  // Second join - should link to the existing guest record, not create a duplicate
  const secondSession = await api.functional.redditClone.auth.guest.join(
    connection,
    {
      body: {
        fingerprint: fingerprint,
        href: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCloneGuestSession.IJoin,
    },
  );
  typia.assert(secondSession);
  // Validate session continuity - guest ID should remain consistent
  TestValidator.equals(
    "guest ID should be consistent",
    firstSession.id,
    secondSession.id,
  );
  // Both sessions should have valid tokens
  TestValidator.predicate(
    "first session has valid access token",
    firstSession.token.access.length > 0,
  );
  TestValidator.predicate(
    "first session has valid refresh token",
    firstSession.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "second session has valid access token",
    secondSession.token.access.length > 0,
  );
  TestValidator.predicate(
    "second session has valid refresh token",
    secondSession.token.refresh.length > 0,
  );
  // Token expiration should be valid date-time format
  TestValidator.predicate(
    "first session expired_at is valid",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(firstSession.token.expired_at),
  );
  TestValidator.predicate(
    "first session refreshable_until is valid",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      firstSession.token.refreshable_until,
    ),
  );
  TestValidator.predicate(
    "second session expired_at is valid",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(secondSession.token.expired_at),
  );
  TestValidator.predicate(
    "second session refreshable_until is valid",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      secondSession.token.refreshable_until,
    ),
  );
}
