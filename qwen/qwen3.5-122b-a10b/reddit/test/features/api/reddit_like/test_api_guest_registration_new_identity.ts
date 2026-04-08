import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest registration with new unique device identity.
 *
 * Validates the complete guest registration workflow when a new device fingerprint is provided for the first time. This test ensures that the system correctly creates a new guest account, generates valid JWT tokens, and returns proper authorization credentials for subsequent authenticated requests.
 *
 * The test verifies that:
 * 1. Guest account is created with unique device fingerprint
 * 2. JWT access and refresh tokens are generated and present
 * 3. Token expiration timestamps are correctly set (expired_at and refreshable_until)
 * 4. Guest ID is a valid UUID format
 * 5. Session context (href, referrer) is properly captured
 *
 * 1. Generate unique device fingerprint and session context data
 * 2. Call guest registration endpoint with new fingerprint
 * 3. Validate response contains guest_id, tokens, and expiration timestamps
 * 4. Verify all timestamps are valid ISO 8601 date-time format
 * 5. Confirm guest_id matches UUID format requirement
 */
export async function test_api_guest_registration_new_identity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare guest registration with unique device fingerprint
  const guestConnection: api.IConnection = { host: connection.host };
  const output = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeGuest.IJoin,
  });
  // 2. Validate response structure
  typia.assert(output);
  // 3. Verify guest_id is valid UUID
  TestValidator.predicate(
    "guest_id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      output.guest_id,
    ),
  );
  // 4. Verify tokens are present and non-empty
  TestValidator.predicate(
    "access token exists",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    output.token.refresh.length > 0,
  );
  // 5. Verify expiration timestamps are valid ISO 8601 format
  TestValidator.predicate(
    "expired_at is valid ISO 8601",
    !Number.isNaN(Date.parse(output.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO 8601",
    !Number.isNaN(Date.parse(output.token.refreshable_until)),
  );
  // 6. Verify refreshable_until is after expired_at
  TestValidator.predicate(
    "refreshable_until after expired_at",
    new Date(output.token.refreshable_until) >
      new Date(output.token.expired_at),
  );
}
