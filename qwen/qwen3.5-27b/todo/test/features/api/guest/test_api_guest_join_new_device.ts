import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test successful guest registration with a new device token.
 *
 * This test verifies the complete guest registration workflow:
 * 1. Create a new guest connection for authentication
 * 2. Register a guest with a unique device token and session metadata
 * 3. Validate the response contains guest ID and authorization tokens
 * 4. Verify token structure and expiration timestamps
 * 5. Confirm the connection is automatically updated with access token
 */
export async function test_api_guest_join_new_device(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest-specific connection for authentication
  const guestConnection: api.IConnection = { host: connection.host };
  // 2. Register guest with unique device token and session metadata
  const authorized: IMultiUserTodoGuest.IAuthorized =
    await authorize_guest_join(guestConnection, {
      body: {
        device_token: RandomGenerator.alphaNumeric(32),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IMultiUserTodoGuest.IJoin,
    });
  // 3. Validate response structure
  typia.assert(authorized);
  // 4. Verify guest ID is a valid UUID
  TestValidator.predicate(
    "guest ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );
  // 5. Verify token structure
  TestValidator.predicate(
    "access token exists",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    authorized.token.refresh.length > 0,
  );
  // 6. Verify expiration timestamps are valid date-time format
  TestValidator.predicate(
    "expired_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(authorized.token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      authorized.token.refreshable_until,
    ),
  );
  // 7. Verify connection was automatically updated with access token
  TestValidator.equals(
    "connection has authorization header",
    guestConnection.headers?.Authorization,
    authorized.token.access,
  );
}
