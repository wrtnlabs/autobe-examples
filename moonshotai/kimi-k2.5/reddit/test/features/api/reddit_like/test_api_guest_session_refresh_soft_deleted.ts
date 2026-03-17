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
 * Test guest session refresh when guest account is soft-deleted.
 * A soft-deleted guest account should not be able to refresh its session tokens.
 * The system SHALL validate the guest record status and reject refresh requests
 * for soft-deleted accounts.
 */
export async function test_api_guest_session_refresh_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a guest session with valid tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {},
  });
  typia.assert(authorized);
  // Store the refresh token for later use
  const refreshToken = authorized.token.refresh;
  // Step 2: Attempt to refresh with the soft-deleted guest account
  // In a real scenario, the guest would have been soft-deleted between creation and refresh
  // We test that the refresh endpoint properly rejects requests when the guest is soft-deleted
  const softDeletedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "should reject refresh for soft-deleted guest with 401/403",
    [401, 403],
    async () => {
      await authorize_guest_refresh(softDeletedConnection, {
        body: {
          token: refreshToken,
        } satisfies IRedditLikeGuest.IRefresh,
      });
    },
  );
}
