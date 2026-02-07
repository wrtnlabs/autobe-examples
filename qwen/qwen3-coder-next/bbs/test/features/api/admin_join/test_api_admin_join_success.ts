import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for admin registration
  const adminConnection: api.IConnection = { host: connection.host };
  // Register a new admin account
  const result = await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  // Validate response structure
  typia.assert(result);
  typia.assert(result.token);
  // Verify authorization token properties
  TestValidator.predicate(
    "has access token",
    result.token.access !== undefined,
  );
  TestValidator.predicate(
    "has refresh token",
    result.token.refresh !== undefined,
  );
  TestValidator.predicate(
    "has expiration time",
    result.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "has refreshable until time",
    result.token.refreshable_until !== undefined,
  );
  // Verify token format (ISO 8601 date-time format)
  TestValidator.predicate(
    "expired_at is valid ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$/.test(
      result.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$/.test(
      result.token.refreshable_until,
    ),
  );
  // Verify token expiry is in future
  const now = new Date();
  const expiredAt = new Date(result.token.expired_at);
  const refreshableUntil = new Date(result.token.refreshable_until);
  TestValidator.predicate("expired_at is in future", expiredAt > now);
  TestValidator.predicate(
    "refreshable_until is in future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil > expiredAt,
  );
}
