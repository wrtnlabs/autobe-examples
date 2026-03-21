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

export async function test_api_guest_registration_session_tracking_metadata(
  connection: api.IConnection,
): Promise<void> {
  // Generate session tracking metadata
  const deviceId = typia.random<string & tags.Format<"uuid">>();
  const href = "/todos" satisfies string & tags.Format<"uri">;
  const referrer = "https://example.com" satisfies string & tags.Format<"uri">;
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Register guest with session tracking metadata
  const authorized = await authorize_guest_join(connection, {
    body: {
      device_id: deviceId,
      href: href,
      referrer: referrer,
      ip: ip,
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  // Validate response with typia.assert
  typia.assert(authorized);
  // Validate authentication tokens exist and are non-empty
  TestValidator.predicate("access token exists", authorized.access.length > 0);
  TestValidator.predicate(
    "refresh token exists",
    authorized.refresh.length > 0,
  );
  TestValidator.predicate("guest id exists", authorized.id.length > 0);
  // Validate expired_at timestamp is in the future
  const expiredAt = new Date(authorized.expired_at);
  const now = new Date();
  TestValidator.predicate(
    "expired_at is in the future",
    expiredAt.getTime() > now.getTime(),
  );
  // Validate token contains expected structure
  TestValidator.predicate(
    "token.access exists",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh exists",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at exists",
    authorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token.refreshable_until exists",
    authorized.token.refreshable_until.length > 0,
  );
  // Validate token expiration timestamps
  const tokenExpiredAt = new Date(authorized.token.expired_at);
  const tokenRefreshableUntil = new Date(authorized.token.refreshable_until);
  TestValidator.predicate(
    "token.expired_at is in the future",
    tokenExpiredAt.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "token.refreshable_until is in the future",
    tokenRefreshableUntil.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "token.refreshable_until is after expired_at",
    tokenRefreshableUntil.getTime() > tokenExpiredAt.getTime(),
  );
}
