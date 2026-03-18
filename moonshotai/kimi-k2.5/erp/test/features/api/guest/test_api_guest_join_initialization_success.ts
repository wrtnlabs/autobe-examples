import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test successful initialization of a new guest session for first-time visitor.
 * Send POST request with unique device fingerprint (unique string identifier),
 * valid href URL, referrer URL, and optional IPv4 address. Verify response
 * contains: guest id (UUID format), token object with access token (JWT string),
 * refresh token (JWT string), expired_at (ISO timestamp), and refreshable_until
 * (ISO timestamp). Validate that access token and refresh token are non-empty
 * strings. Validate that expired_at is a future timestamp. Validate that
 * refreshable_until is later than expired_at.
 */
export async function test_api_guest_join_initialization_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for guest (isolation pattern)
  const guestConnection: api.IConnection = { host: connection.host };
  // Initialize guest session using utility function
  const response = await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  // Validate response structure (complete type validation)
  typia.assert(response);
  // Validate access token and refresh token are non-empty strings
  TestValidator.predicate(
    "access token is non-empty string",
    response.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    response.token.refresh.length > 0,
  );
  // Validate expired_at is a future timestamp
  const expiredAt = new Date(response.token.expired_at);
  const now = new Date();
  TestValidator.predicate(
    "expired_at is future timestamp",
    expiredAt.getTime() > now.getTime(),
  );
  // Validate refreshable_until is later than expired_at
  const refreshableUntil = new Date(response.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is later than expired_at",
    refreshableUntil.getTime() > expiredAt.getTime(),
  );
}
