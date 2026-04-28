import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Tests the primary session renewal workflow for unauthenticated guest users browsing public entry points.
 *
 * Establishes an initial guest session via the join endpoint to capture the issued refresh token,
 * then submits this token to the refresh endpoint. Validates that the renewed response contains:
 * a matching guest id, new access and refresh tokens, and updated future timestamps.
 *
 * 1. Create an initial guest session via join to get initial tokens and guest ID.
 * 2. Extract the refresh token from the initial authorization response.
 * 3. Call the refresh endpoint using the captured refresh token.
 * 4. Assert the renewed IAuthorized response structure.
 * 5. Validate that the guest ID matches the initial session.
 * 6. Verify that the new access token, refresh token, and timestamps are valid and in the future.
 */
export async function test_api_guest_session_renewal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create an initial guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const initialAuthorized = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: typia.random<string & tags.MinLength<1>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformGuest.IJoin,
  });
  // 2. Extract the refresh token and guest ID from the initial session
  const initialGuestId = initialAuthorized.id;
  const refreshBody = {
    refresh: initialAuthorized.token.refresh,
  } satisfies IHrmPlatformGuest.IRefresh;
  // 3. Call the refresh endpoint using the captured refresh token
  const renewedConnection: api.IConnection = { host: connection.host };
  const renewedAuthorized = await authorize_guest_refresh(renewedConnection, {
    body: refreshBody,
  });
  // 4. Assert the renewed IAuthorized response structure
  typia.assert(renewedAuthorized);
  // 5. Validate guest ID matches initial session
  TestValidator.equals(
    "guest id matches initial session",
    renewedAuthorized.id,
    initialGuestId,
  );
  // 6. Verify tokens are present
  TestValidator.predicate(
    "access token is present",
    renewedAuthorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    renewedAuthorized.token.refresh.length > 0,
  );
  // 7. Verify timestamps are valid and in the future
  TestValidator.predicate(
    "expired_at timestamp is in the future",
    () => new Date(renewedAuthorized.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until timestamp is in the future",
    () => new Date(renewedAuthorized.token.refreshable_until) > new Date(),
  );
}
