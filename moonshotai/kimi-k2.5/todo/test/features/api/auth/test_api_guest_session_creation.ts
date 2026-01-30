import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
export async function test_api_guest_session_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new guest-specific connection
  // The base connection is only used to extract the host; we never use it directly for API calls
  const guestConnection: api.IConnection = { host: connection.host };
  // Step 2: Create guest session using the utility function
  // This generates random href and referrer values if not provided, and updates guestConnection.headers internally
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      href: `https://${RandomGenerator.alphabets(10)}.example.com/page`,
      referrer: `https://${RandomGenerator.alphabets(8)}.example.com/previous`,
    },
  });
  // Step 3: Validate the response structure matches ITodoAppGuest.IAuthorized
  // This validates: id (UUID format), token (IAuthorizationToken with access, refresh, expired_at, refreshable_until)
  typia.assert(guestAuth);
  // Step 4: Verify token structure and expiration metadata
  TestValidator.predicate(
    "access token exists",
    guestAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    guestAuth.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid ISO datetime",
    new Date(guestAuth.token.expired_at).toISOString() ===
      guestAuth.token.expired_at,
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO datetime",
    new Date(guestAuth.token.refreshable_until).toISOString() ===
      guestAuth.token.refreshable_until,
  );
  // Step 5: Verify the connection headers were updated with the access token
  TestValidator.predicate(
    "Authorization header is set in connection",
    guestConnection.headers?.Authorization === guestAuth.token.access,
  );
}
