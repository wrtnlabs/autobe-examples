import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest join with new identity — verifies that a first-time visitor with an unseen
 * device fingerprint creates a fresh guest identity and receives valid JWT tokens.
 *
 * Validates the complete guest join flow including identity record creation, session
 * establishment, and JWT token issuance. Confirms that the fingerprint is correctly
 * stored and that brand-new records have identical created_at and updated_at timestamps.
 *
 * Also validates token structure: non-empty access and refresh tokens that differ from
 * each other, with expiration timestamps set in the future and the refresh window
 * extending beyond the access token's expiration.
 *
 * 1. First guest joins with a unique fingerprint, generating a new identity and session.
 * 2. Identity fields are validated: fingerprint matches input, created_at equals updated_at.
 * 3. Token fields are validated: non-empty, distinct access/refresh, future expirations.
 * 4. Second guest joins with a different fingerprint, confirming a distinct identity id.
 */
export async function test_api_guest_join_new_identity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first guest connection with a unique fingerprint
  const fingerprint1 = RandomGenerator.alphaNumeric(64);
  const href1 = typia.random<string & tags.Format<"uri">>();
  const referrer1 = typia.random<string & tags.Format<"uri">>();
  const guestConnection1: api.IConnection = { host: connection.host };
  const result1 = await authorize_guest_join(guestConnection1, {
    body: { fingerprint: fingerprint1, href: href1, referrer: referrer1 },
  });
  typia.assert(result1);
  // 2. Validate identity fields
  TestValidator.equals(
    "fingerprint matches input",
    result1.fingerprint,
    fingerprint1,
  );
  TestValidator.equals(
    "created_at equals updated_at",
    result1.created_at,
    result1.updated_at,
  );
  // 3. Validate token fields
  TestValidator.predicate(
    "access token non-empty",
    result1.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token non-empty",
    result1.token.refresh.length > 0,
  );
  TestValidator.notEquals(
    "access and refresh tokens differ",
    result1.token.access,
    result1.token.refresh,
  );
  const now = new Date();
  const expiredAt = new Date(result1.token.expired_at);
  const refreshableUntil = new Date(result1.token.refreshable_until);
  TestValidator.predicate("access token not expired", expiredAt > now);
  TestValidator.predicate(
    "refresh window beyond access expiry",
    refreshableUntil > expiredAt,
  );
  // 4. Create second guest connection with different fingerprint
  const fingerprint2 = RandomGenerator.alphaNumeric(64);
  const href2 = typia.random<string & tags.Format<"uri">>();
  const referrer2 = typia.random<string & tags.Format<"uri">>();
  const guestConnection2: api.IConnection = { host: connection.host };
  const result2 = await authorize_guest_join(guestConnection2, {
    body: { fingerprint: fingerprint2, href: href2, referrer: referrer2 },
  });
  typia.assert(result2);
  // 5. Verify distinct identities
  TestValidator.notEquals("different guest identities", result1.id, result2.id);
  TestValidator.equals(
    "second fingerprint matches input",
    result2.fingerprint,
    fingerprint2,
  );
}
