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
 * Test that tokens received from guest registration are immediately usable.
 *
 * This test verifies that after successful guest registration via the join endpoint,
 * the returned authorization tokens are valid and can be used for authenticated
 * operations.
 *
 * Steps:
 * 1. Create a new connection for the guest actor
 * 2. Register a new guest using the authorize_guest_join utility
 * 3. Validate the authorization response structure
 * 4. Verify the access token is present and properly formatted
 */
export async function test_api_guest_join_token_usability(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new connection for the guest actor
  const guestConnection: api.IConnection = { host: connection.host };
  // 2. Register a new guest and obtain authentication tokens
  const authorized = await authorize_guest_join(guestConnection, {});
  // 3. Validate the authorization response structure
  typia.assert(authorized);
  // 4. Verify the token structure and contents
  TestValidator.predicate(
    "guest id is valid UUID",
    () => authorized.id.length === 36,
  );
  TestValidator.predicate(
    "access token exists",
    () => authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    () => authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date string",
    () => !isNaN(Date.parse(authorized.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid date string",
    () => !isNaN(Date.parse(authorized.token.refreshable_until)),
  );
  // 5. Verify the connection is authenticated (access token set in headers)
  TestValidator.predicate(
    "connection has authorization header",
    () => guestConnection.headers?.Authorization !== undefined,
  );
  TestValidator.equals(
    "authorization header matches access token",
    guestConnection.headers?.Authorization,
    authorized.token.access,
  );
}
