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
 * Test guest identity creation with complete session context.
 * Validates that the join endpoint returns valid guest ID, access token,
 * and refresh token with expiration timestamps when session context
 * (href, referrer, device_id, ip) is provided.
 */
export async function test_api_guest_join_with_full_session_context(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for guest
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate complete session context with explicit device_id
  const deviceId = typia.random<string & tags.Format<"uuid">>();
  const href = "https://example.com/todo/create";
  const referrer = "https://example.com/dashboard";
  const ip = "192.168.1.1";
  // Join as guest with full session context
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      device_id: deviceId,
      href,
      referrer,
      ip,
    },
  });
  typia.assert(authorized);
  // Validate token expiration timestamps are valid ISO datetime
  const token = authorized.token;
  TestValidator.predicate("expired_at is valid ISO datetime", () => {
    const expiredAt = new Date(token.expired_at);
    return !isNaN(expiredAt.getTime());
  });
  TestValidator.predicate("refreshable_until is valid ISO datetime", () => {
    const refreshableUntil = new Date(token.refreshable_until);
    return !isNaN(refreshableUntil.getTime());
  });
  // Validate that access and refresh tokens are non-empty strings
  TestValidator.predicate(
    "access token is non-empty",
    () => token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    () => token.refresh.length > 0,
  );
}
