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
 * Test guest session refresh with valid tokens.
 *
 * Note: The original scenario requested testing refresh failure after account soft deletion,
 * but the soft delete API endpoint is not available in the provided SDK functions. This test
 * verifies that refresh works correctly with valid tokens. Testing the soft deletion rejection
 * path (401 Unauthorized for deleted accounts) would require access to a delete endpoint that
 * is not exposed in the current SDK.
 *
 * Test flow:
 * 1. Guest joins and receives valid tokens
 * 2. Guest successfully refreshes session with the refresh token
 * 3. Validate new tokens are issued and differ from original tokens
 */
export async function test_api_guest_refresh_after_account_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest joins and receives valid tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: typia.random<string & tags.MinLength<1>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(authorized);
  // 2. Attempt to refresh with the valid refresh token
  const refreshed = await authorize_guest_refresh(guestConnection, {
    body: {
      refresh_token: authorized.token.refresh,
    } satisfies ITodoAppGuest.IRefresh,
  });
  typia.assert(refreshed);
  // 3. Validate the refresh response
  TestValidator.notEquals(
    "new access token differs from original",
    authorized.token.access,
    refreshed.token.access,
  );
  TestValidator.notEquals(
    "new refresh token differs from original",
    authorized.token.refresh,
    refreshed.token.refresh,
  );
}
