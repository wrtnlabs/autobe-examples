import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPrivateTodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test successful guest registration flow.
 *
 * Scenario: A new guest visitor registers for a member account with valid credentials.
 *
 * Steps:
 * 1. Create a new connection object for the guest actor
 * 2. Use authorize_guest_join utility function to register with valid credentials
 * 3. Validate response contains required fields (id, token)
 * 4. Validate token expiration timing (2-hour access, 14-day refresh)
 */
export async function test_api_guest_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create guest-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Register new guest with valid credentials
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Validate token expiration timing (business logic)
  const now = new Date();
  const expiredAt = new Date(authorized.token.expired_at);
  const refreshableUntil = new Date(authorized.token.refreshable_until);
  // Access token should expire in approximately 2 hours
  const twoHoursInMs = 2 * 60 * 60 * 1000;
  const expiredAtDiff = expiredAt.getTime() - now.getTime();
  TestValidator.predicate(
    "access token expires approximately 2 hours from now",
    expiredAtDiff > 0 && expiredAtDiff <= twoHoursInMs + 60000,
  );
  // Refresh token should expire in approximately 14 days
  const fourteenDaysInMs = 14 * 24 * 60 * 60 * 1000;
  const refreshableUntilDiff = refreshableUntil.getTime() - now.getTime();
  TestValidator.predicate(
    "refresh token expires approximately 14 days from now",
    refreshableUntilDiff > 0 &&
      refreshableUntilDiff <= fourteenDaysInMs + 60000,
  );
}
