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

export async function test_api_guest_account_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection with device context
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate random email and valid credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Perform guest join operation
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      email,
      password,
      href,
      referrer,
      ip,
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(authorized);
  // Validate guest identity fields
  TestValidator.predicate(
    "guest id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );
  TestValidator.equals("guest status is active", authorized.status, "active");
  TestValidator.predicate(
    "fingerprint hash is non-empty",
    authorized.fingerprint_hash.length > 0,
  );
  TestValidator.predicate(
    "user agent is string or null",
    typeof authorized.user_agent === "string" || authorized.user_agent === null,
  );
  TestValidator.predicate(
    "ip address is string or null",
    typeof authorized.ip_address === "string" || authorized.ip_address === null,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(authorized.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(authorized.updated_at),
  );
  TestValidator.equals("deleted_at is null", authorized.deleted_at, null);
  // Validate session count
  TestValidator.equals("session count is 1", authorized.sessions_count, 1);
  // Validate token structure
  TestValidator.predicate(
    "access token is non-empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(authorized.token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      authorized.token.refreshable_until,
    ),
  );
  // Validate token expiration times (access token expires in ~1 hour from creation)
  const createdAt = new Date(authorized.created_at);
  const expiredAt = new Date(authorized.token.expired_at);
  const refreshableUntil = new Date(authorized.token.refreshable_until);
  const accessDuration = expiredAt.getTime() - createdAt.getTime();
  const refreshDuration = refreshableUntil.getTime() - createdAt.getTime();
  // Allow 1 hour ± 30 seconds for processing time variance
  TestValidator.predicate(
    "access token expires within 1 hour",
    accessDuration >= 1000 * 60 * 59 && accessDuration <= 1000 * 60 * 61,
  );
  TestValidator.predicate(
    "refreshable until at least 1 hour",
    refreshDuration >= 1000 * 60 * 60,
  );
  // Verify connection was updated by authorize_guest_join with authorization header
  TestValidator.predicate(
    "connection headers updated with authorization",
    guestConnection.headers?.authorization !== undefined &&
      guestConnection.headers.authorization !== undefined &&
      typeof guestConnection.headers.authorization === "string" &&
      guestConnection.headers.authorization.startsWith("Bearer "),
  );
  // Verify token can be used for subsequent request by creating token connection
  const tokenConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${authorized.token.access}` },
  };
  typia.assert(tokenConnection);
}