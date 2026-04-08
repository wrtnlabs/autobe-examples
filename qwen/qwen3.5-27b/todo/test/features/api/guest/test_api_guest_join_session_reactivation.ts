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
 * Test guest join session reactivation with duplicate device fingerprint.
 *
 * Validates that when a guest joins with an existing device fingerprint, the system reactivates the existing session instead of creating a duplicate guest account. This ensures proper handling of returning guests who may have previously authenticated as anonymous users.
 *
 * The test verifies that the same guest ID is returned across multiple join attempts with the same fingerprint, while new authentication tokens are issued for each session activation.
 *
 * 1. Guest joins with a specific device fingerprint to create initial account.
 * 2. Guest joins again with the same device fingerprint.
 * 3. Validates that both responses return the same guest ID.
 * 4. Confirms that new tokens are issued for the reactivated session.
 * 5. Ensures no duplicate guest records are created.
 */
export async function test_api_guest_join_session_reactivation(
  connection: api.IConnection,
): Promise<void> {
  // 1. First guest join - creates new guest account
  const firstConnection: api.IConnection = { host: connection.host };
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  const firstAuth = await authorize_guest_join(firstConnection, {
    body: {
      deviceFingerprint: deviceFingerprint,
    },
  });
  typia.assert(firstAuth);
  // 2. Second guest join - should reactivate existing session
  const secondConnection: api.IConnection = { host: connection.host };
  const secondAuth = await authorize_guest_join(secondConnection, {
    body: {
      deviceFingerprint: deviceFingerprint,
    },
  });
  typia.assert(secondAuth);
  // 3. Validate that same guest ID is returned (no duplicate account)
  TestValidator.equals("guest ID should be same", firstAuth.id, secondAuth.id);
  // 4. Validate that new tokens are issued for reactivated session
  TestValidator.notEquals(
    "access token should be new",
    firstAuth.token.access,
    secondAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be new",
    firstAuth.token.refresh,
    secondAuth.token.refresh,
  );
  // 5. Validate that tokens are properly structured
  TestValidator.predicate(
    "first token has valid structure",
    firstAuth.token.access.length > 0 &&
      firstAuth.token.refresh.length > 0 &&
      firstAuth.token.expired_at.length > 0 &&
      firstAuth.token.refreshable_until.length > 0,
  );
  TestValidator.predicate(
    "second token has valid structure",
    secondAuth.token.access.length > 0 &&
      secondAuth.token.refresh.length > 0 &&
      secondAuth.token.expired_at.length > 0 &&
      secondAuth.token.refreshable_until.length > 0,
  );
}
