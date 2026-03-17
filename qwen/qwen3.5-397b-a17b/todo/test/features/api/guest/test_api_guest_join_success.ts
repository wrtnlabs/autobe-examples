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
 * Test successful guest account registration for anonymous users.
 *
 * This test validates the primary success path for guest user onboarding:
 * 1. Submit a POST request with unique device fingerprint, href, and referrer
 * 2. Verify response returns complete guest account with UUID and timestamps
 * 3. Confirm JWT authorization tokens (access and refresh) with expiration
 * 4. Validate guest account is created with deleted_at as null (active)
 * 5. Ensure access token is set in connection headers for subsequent requests
 */
export async function test_api_guest_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection and register
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  // Validate complete response structure
  typia.assert(authorized);
  // Verify guest account properties
  TestValidator.equals(
    "device fingerprint matches",
    authorized.guest.device_fingerprint,
    authorized.device_fingerprint,
  );
  TestValidator.equals(
    "deleted_at is null for active account",
    authorized.guest.deleted_at,
    null,
  );
  TestValidator.predicate(
    "created_at exists",
    authorized.guest.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at exists",
    authorized.guest.updated_at.length > 0,
  );
  // Verify token properties
  TestValidator.predicate(
    "access token is non-empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid timestamp",
    authorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is valid timestamp",
    authorized.token.refreshable_until.length > 0,
  );
  // Verify connection was updated with authorization token
  TestValidator.predicate(
    "connection has Authorization header",
    guestConnection.headers?.Authorization !== undefined,
  );
}
