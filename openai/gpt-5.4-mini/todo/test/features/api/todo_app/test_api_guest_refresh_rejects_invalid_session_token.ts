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
 * Reject invalid guest refresh tokens without mutating the current guest authorization state.
 *
 * This test validates the guest refresh failure path for expired, revoked, or otherwise unusable session tokens. It first establishes a valid guest authorization context, then submits an intentionally invalid refresh token to ensure the endpoint responds with unauthorized access.
 *
 * The test also verifies that the original guest authorization payload and connection state remain unchanged after the failed refresh attempt, confirming that an unsuccessful refresh does not silently rotate or replace the active guest session.
 *
 * 1. Create a valid guest authorization context through guest join.
 * 2. Preserve the original authorized payload and active authorization header.
 * 3. Attempt to refresh using an invalid session token.
 * 4. Confirm the refresh request is rejected and the original guest authorization state remains intact.
 */
export async function test_api_guest_refresh_rejects_invalid_session_token(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      href: "https://example.com/guest",
      referrer: "https://example.com/start",
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(authorized);
  const originalAuthorized =
    typia.assert<ITodoAppGuest.IAuthorized>(authorized);
  const originalAuthorizationHeader = guestConnection.headers?.Authorization;
  await TestValidator.httpError(
    "guest refresh should reject invalid session token",
    401,
    async () => {
      await api.functional.todoApp.auth.guest.refresh(guestConnection, {
        body: {
          refreshToken: "definitely-invalid-refresh-token",
        } satisfies ITodoAppGuest.IRefresh,
      });
    },
  );
  TestValidator.equals(
    "guest access token should remain unchanged",
    guestConnection.headers?.Authorization,
    originalAuthorizationHeader,
  );
  TestValidator.equals(
    "original authorized payload should remain unchanged",
    authorized,
    originalAuthorized,
  );
}
