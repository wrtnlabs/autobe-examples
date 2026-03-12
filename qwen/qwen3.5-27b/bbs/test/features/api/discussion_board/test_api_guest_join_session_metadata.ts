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
 * Test that guest join properly captures and stores session metadata for security auditing and traffic source tracking.
 * The test verifies that the guest join operation successfully creates a guest identity and session with:
 * - Device fingerprint for guest identification
 * - Current URL (href) as the entry point
 * - Referrer URL for traffic source tracking
 * - Client IP address for security auditing
 * - Authorization tokens for session access
 */
export async function test_api_guest_join_session_metadata(
  connection: api.IConnection,
): Promise<void> {
  // Create guest-specific connection for authentication
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate test data for guest join
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  // Execute guest join using utility function (priority over SDK)
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: href,
      referrer: referrer,
      ip: ip,
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  // Validate response structure
  typia.assert(authorized);
  // Verify guest identity was created
  TestValidator.equals("guest id is UUID", typeof authorized.id, "string");
  TestValidator.predicate(
    "guest id matches UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );
  // Verify authorization token structure
  TestValidator.equals(
    "access token exists",
    authorized.token.access.length,
    0,
  );
  TestValidator.predicate(
    "access token is non-empty string",
    authorized.token.access.length > 0,
  );
  TestValidator.equals(
    "refresh token exists",
    authorized.token.refresh.length,
    0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    authorized.token.refresh.length > 0,
  );
  // Verify token expiration timestamps
  TestValidator.predicate(
    "expired_at is valid date-time",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T| )( [01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      authorized.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T| )( [01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      authorized.token.refreshable_until,
    ),
  );
  // Verify connection was updated with authorization header
  TestValidator.predicate(
    "connection has authorization header",
    guestConnection.headers?.Authorization !== undefined,
  );
  TestValidator.equals(
    "authorization header uses Bearer scheme",
    typeof guestConnection.headers?.Authorization === "string" && guestConnection.headers?.Authorization.startsWith("Bearer "),
    true,
  );
}