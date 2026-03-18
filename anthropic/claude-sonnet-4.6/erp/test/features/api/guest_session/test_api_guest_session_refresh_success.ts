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

export async function test_api_guest_session_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a fresh guest connection and join to get initial tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_guest_join(guestConnection, {
    body: {
      fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResponse);
  // Capture initial identity and tokens
  const originalId = joinResponse.id;
  const originalFingerprint = joinResponse.fingerprint;
  const originalCreatedAt = joinResponse.created_at;
  const originalAccessToken = joinResponse.token.access;
  const originalRefreshToken = joinResponse.token.refresh;
  // Step 2: Create a separate connection for the refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // Step 3: Call authorize_guest_refresh with the refresh token from join
  const refreshResponse = await authorize_guest_refresh(refreshConnection, {
    body: {
      refresh: originalRefreshToken,
    } satisfies IErpHrmGuest.IRefresh,
  });
  typia.assert(refreshResponse);
  // Validation: Guest identity must be preserved
  TestValidator.equals("guest id preserved", refreshResponse.id, originalId);
  TestValidator.equals(
    "fingerprint preserved",
    refreshResponse.fingerprint,
    originalFingerprint,
  );
  TestValidator.equals(
    "created_at preserved",
    refreshResponse.created_at,
    originalCreatedAt,
  );
  // Validation: New access token must be different (fresh token issued)
  TestValidator.notEquals(
    "access token refreshed",
    refreshResponse.token.access,
    originalAccessToken,
  );
  // Validation: Tokens must be non-empty
  TestValidator.predicate(
    "access token non-empty",
    refreshResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token non-empty",
    refreshResponse.token.refresh.length > 0,
  );
  // Validation: expired_at must be in the future
  const now = new Date().toISOString();
  TestValidator.predicate(
    "expired_at is in the future",
    refreshResponse.token.expired_at > now,
  );
  // Validation: refreshable_until must be in the future and >= expired_at
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshResponse.token.refreshable_until > now,
  );
  TestValidator.predicate(
    "refreshable_until >= expired_at",
    refreshResponse.token.refreshable_until >= refreshResponse.token.expired_at,
  );
}
