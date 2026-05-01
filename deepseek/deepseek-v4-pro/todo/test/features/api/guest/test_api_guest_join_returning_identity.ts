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
 * Test returning guest identity persistence across sessions.
 *
 * Validates that a guest visitor with an already-known device fingerprint reuses the same guest identity record while receiving a brand new session with distinct JWT token pair.
 *
 * The test ensures that the guest identity (id, fingerprint, created_at) remains stable across multiple sessions, while session-scoped data (tokens, timestamps) is refreshed on each join operation. This confirms the upsert behavior where the fingerprint acts as the lookup key for identity reuse.
 *
 * 1. First join with fingerprint "fp-returning-001" — captures guest identity and token pair.
 * 2. Second join with the same fingerprint — verifies identity reuse and token rotation.
 * 3. Validates id, fingerprint, and created_at are identical across both joins.
 * 4. Validates updated_at is newer than created_at, confirming the record was touched.
 * 5. Validates access token, refresh token, expired_at, and refreshable_until differ between sessions.
 */
export async function test_api_guest_join_returning_identity(
  connection: api.IConnection,
): Promise<void> {
  const fingerprint = "fp-returning-001";
  // 1. First guest join
  const firstConnection: api.IConnection = { host: connection.host };
  const firstResult = await authorize_guest_join(firstConnection, {
    body: { fingerprint },
  });
  typia.assert(firstResult);
  // 2. Second guest join with same fingerprint
  const secondConnection: api.IConnection = { host: connection.host };
  const secondResult = await authorize_guest_join(secondConnection, {
    body: { fingerprint },
  });
  typia.assert(secondResult);
  // 3. Validate identity persistence
  TestValidator.equals("id unchanged", secondResult.id, firstResult.id);
  TestValidator.equals(
    "fingerprint matches",
    secondResult.fingerprint,
    fingerprint,
  );
  // 4. Validate timestamps
  TestValidator.equals(
    "created_at unchanged",
    secondResult.created_at,
    firstResult.created_at,
  );
  TestValidator.predicate(
    "updated_at more recent than created_at",
    () => secondResult.updated_at > firstResult.created_at,
  );
  // 5. Validate token rotation
  TestValidator.notEquals(
    "access token rotates",
    secondResult.token.access,
    firstResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotates",
    secondResult.token.refresh,
    firstResult.token.refresh,
  );
  TestValidator.notEquals(
    "expired_at is new",
    secondResult.token.expired_at,
    firstResult.token.expired_at,
  );
  TestValidator.notEquals(
    "refreshable_until is new",
    secondResult.token.refreshable_until,
    firstResult.token.refreshable_until,
  );
}
