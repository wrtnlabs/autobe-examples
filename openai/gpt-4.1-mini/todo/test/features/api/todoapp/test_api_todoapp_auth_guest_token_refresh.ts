import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAccessToken";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
/**
 * End-to-end test to validate guest authentication token refresh flow.
 *
 * This test covers the entire lifecycle of a guest user session in the Todo
 * application:
 *
 * 1. A new guest user registers (joins), receiving an initial access and refresh
 *    token along with a guest ID.
 * 2. Validates initial tokens are strings and present.
 * 3. Uses the refresh token to request new tokens via the refresh endpoint.
 * 4. Validates that the new tokens are received and differ from the initial ones,
 *    ensuring token rotation and secure session continuation.
 * 5. Ensures the guest ID remains consistent, verifying correct session identity.
 *
 * This test guarantees secure and robust token refresh mechanisms for guest
 * sessions, critical for maintaining transient authenticated access in the
 * system.
 */
export async function test_api_todoapp_auth_guest_token_refresh(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an isolated connection for guest and join
  const guestConnection: api.IConnection = { host: connection.host };
  const guestJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    ip: null,
    href: `https://${RandomGenerator.alphabets(8)}.com`,
    referrer: `https://${RandomGenerator.alphabets(8)}.com`,
  } satisfies ITodoAppGuest.IJoin;
  const initialAuthorized: ITodoAppGuest.IAuthorized =
    await authorize_guest_join(guestConnection, {
      body: guestJoinBody,
    });
  typia.assert(initialAuthorized);
  // Validate initial authorized tokens
  TestValidator.predicate(
    "initial access token is a non-empty string",
    typeof initialAuthorized.token.access === "string" &&
      initialAuthorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token is a non-empty string",
    typeof initialAuthorized.token.refresh === "string" &&
      initialAuthorized.token.refresh.length > 0,
  );
  // Step 2: Create another isolated connection for guest refresh
  const guestRefreshConnection: api.IConnection = { host: connection.host };
  // Use refresh token to get new tokens
  const refreshBody: ITodoAppGuest.IRefresh = {
    refresh_token: initialAuthorized.token.refresh,
  };
  const refreshedAuthorized: ITodoAppGuest.IAuthorized =
    await authorize_guest_refresh(guestRefreshConnection, {
      body: refreshBody,
    });
  typia.assert(refreshedAuthorized);
  // Validate refreshed tokens
  TestValidator.predicate(
    "refreshed access token is a non-empty string",
    typeof refreshedAuthorized.token.access === "string" &&
      refreshedAuthorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token is a non-empty string",
    typeof refreshedAuthorized.token.refresh === "string" &&
      refreshedAuthorized.token.refresh.length > 0,
  );
  // Validate that guest ID remains the same
  TestValidator.equals(
    "guest ID remains consistent after refresh",
    refreshedAuthorized.id,
    initialAuthorized.id,
  );
  // Validate that tokens have rotated and are different
  TestValidator.predicate(
    "access token is rotated",
    refreshedAuthorized.token.access !== initialAuthorized.token.access,
  );
  TestValidator.predicate(
    "refresh token is rotated",
    refreshedAuthorized.token.refresh !== initialAuthorized.token.refresh,
  );
}
