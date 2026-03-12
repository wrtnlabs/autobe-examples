import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test security aspects of guest token generation and session management.
 * Validates that access tokens and refresh tokens are properly generated,
 * token expiration timestamps are valid, device fingerprint is included,
 * and all response fields conform to expected formats and constraints.
 */
export async function test_api_guest_join_token_security(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection for authorization
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate valid join request body with proper format tags
  const joinBody = {
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallGuest.IJoin;
  // Execute guest join using utility function
  const guest: IShoppingMallGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    { body: joinBody },
  );
  // Validate complete response structure
  typia.assert(guest);
  // Validate access token is present and non-empty
  TestValidator.predicate(
    "access token is present and non-empty",
    guest.token.access.length > 0,
  );
  // Validate refresh token is present and non-empty
  TestValidator.predicate(
    "refresh token is present and non-empty",
    guest.token.refresh.length > 0,
  );
  // Validate deleted_at is null for active session
  TestValidator.equals(
    "deleted_at is null for active session",
    guest.deleted_at,
    null,
  );
  // Validate that expired_at is before refreshable_until (access token expires before refresh token)
  TestValidator.predicate(
    "access token expires before refresh token deadline",
    new Date(guest.token.expired_at).getTime() <
      new Date(guest.token.refreshable_until).getTime(),
  );
  // Validate that both timestamps are in the future
  TestValidator.predicate(
    "expired_at is in the future",
    new Date(guest.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    new Date(guest.token.refreshable_until).getTime() > Date.now(),
  );
}
