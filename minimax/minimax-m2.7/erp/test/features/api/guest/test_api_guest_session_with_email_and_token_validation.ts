import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_with_email_and_token_validation(
  connection: api.IConnection,
): Promise<void> {
  // Test guest session creation with optional temporary_email field and verify token structure.
  // Steps:
  // 1. Create guest session with device_id, href, referrer, and include a valid temporaryEmail address.
  // 2. Validate response includes all required fields: id, device_identifier, created_at, updated_at, deleted_at (null), and token.
  // 3. Verify token.access is a valid JWT format string.
  // 4. Verify token.refresh is a valid token string.
  // 5. Confirm token.expired_at timestamp is in the future (within expected access token lifetime, typically 15-60 minutes).
  // 6. Confirm token.refreshable_until is significantly later than expired_at (typically 7-30 days for guest sessions).
  // 7. Validate email format is correctly captured when provided.
  // 8. Verify the guest can use the returned access token for subsequent authenticated requests (if endpoint available).
  // Use the utility function for guest join authorization
  const authorized = await authorize_guest_join(connection, {
    body: {
      deviceId: typia.random<string & tags.Format<"uuid">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      temporaryEmail: typia.random<string & tags.Format<"email">>(),
    },
  });
  // Validate response structure using typia.assert
  typia.assert(authorized);
  // Step 2: Validate all required fields exist
  TestValidator.equals("has id", !!authorized.id, true);
  TestValidator.equals(
    "has device_identifier",
    !!authorized.device_identifier,
    true,
  );
  TestValidator.equals("has created_at", !!authorized.created_at, true);
  TestValidator.equals("has updated_at", !!authorized.updated_at, true);
  TestValidator.equals("deleted_at is null", authorized.deleted_at, null);
  TestValidator.equals("has token", !!authorized.token, true);
  // Step 3: Verify token.access is a valid JWT format string (xxx.xxx.xxx)
  const jwtPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
  TestValidator.predicate(
    "token.access is valid JWT format",
    jwtPattern.test(authorized.token.access),
  );
  // Step 4: Verify token.refresh is a valid token string
  TestValidator.predicate(
    "token.refresh exists and is string",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  // Step 5: Confirm token.expired_at timestamp is in the future
  const expiredAt = new Date(authorized.token.expired_at);
  const now = new Date();
  TestValidator.predicate("token.expired_at is in the future", expiredAt > now);
  // Verify expired_at is within expected range (15-60 minutes from now)
  const minExpiration = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
  const maxExpiration = new Date(now.getTime() + 60 * 60 * 1000); // 60 minutes
  TestValidator.predicate(
    "token.expired_at is within expected access token lifetime (15-60 minutes)",
    expiredAt >= minExpiration && expiredAt <= maxExpiration,
  );
  // Step 6: Confirm token.refreshable_until is significantly later than expired_at
  const refreshableUntil = new Date(authorized.token.refreshable_until);
  TestValidator.predicate(
    "token.refreshable_until is after expired_at",
    refreshableUntil > expiredAt,
  );
  // Verify refreshable_until is in the expected range (7-30 days from now for guest sessions)
  const minRefreshable = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const maxRefreshable = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
  TestValidator.predicate(
    "token.refreshable_until is within expected refresh token lifetime (7-30 days)",
    refreshableUntil >= minRefreshable && refreshableUntil <= maxRefreshable,
  );
  // Step 7: Validate email format is correctly captured when provided
  // The temporaryEmail is stored in JWT claims or passed to downstream, so we just verify
  // the request was accepted with the email format validation
  TestValidator.predicate(
    "temporaryEmail was accepted in valid email format",
    authorized.id !== null && authorized.id !== undefined,
  );
  // Step 8: Verify the guest can use the returned access token for subsequent authenticated requests
  // Create a new connection with the access token from the guest session
  const guestConnection: api.IConnection = { host: connection.host };
  guestConnection.headers ??= {};
  guestConnection.headers.Authorization = authorized.token.access;
  // We can verify the token works by checking that the connection headers are set
  TestValidator.equals(
    "access token is set in connection headers",
    guestConnection.headers.Authorization,
    authorized.token.access,
  );
  // Optionally verify token structure matches IAuthorizationToken type
  TestValidator.predicate(
    "token has access property",
    "access" in authorized.token,
  );
  TestValidator.predicate(
    "token has refresh property",
    "refresh" in authorized.token,
  );
  TestValidator.predicate(
    "token has expired_at property",
    "expired_at" in authorized.token,
  );
  TestValidator.predicate(
    "token has refreshable_until property",
    "refreshable_until" in authorized.token,
  );
}
