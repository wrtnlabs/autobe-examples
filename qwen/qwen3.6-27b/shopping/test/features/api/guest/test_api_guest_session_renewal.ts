import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Validates the primary success path for guest session token renewal.
 *
 * Guest with an active session submits their current refresh token to the refresh endpoint. The backend validates the provided refresh token to extract the guest ID, verifies the guest account exists and is not soft-deleted, confirms an active session exists with a future expiration timestamp tied to the submitted refresh token, then generates and returns a new JWT access and refresh token pair. The guest can continue accessing registration and login pages without needing to re-authenticate via device fingerprint.
 *
 * 1. Register a guest account using device fingerprint to establish initial authenticated session and obtain initial authentication tokens.
 * 2. Extract the refresh token from the authorization response.
 * 3. Submit the refresh token to the refresh endpoint to obtain a new token pair.
 * 4. Validate that the renewal response contains correct guest identity and new tokens, ensuring token rotation occurred.
 */
export async function test_api_guest_session_renewal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest account and obtain initial authentication tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
    } satisfies DeepPartial<IEcommercePlatformGuest.IJoin>,
  });
  typia.assert(authorized);
  // 2. Extract refresh token from initial authorization
  const refreshToken: string = authorized.token.refresh;
  // 3. Renew session using the refresh token
  const renewedConnection: api.IConnection = { host: connection.host };
  const renewed = await authorize_guest_refresh(renewedConnection, {
    body: {
      refreshToken,
    } satisfies IEcommercePlatformGuest.IRefresh,
  });
  typia.assert(renewed);
  // 4. Validate renewal response
  TestValidator.equals("guest id remains constant", renewed.id, authorized.id);
  TestValidator.equals(
    "device fingerprint remains constant",
    renewed.device_fingerprint,
    authorized.device_fingerprint,
  );
  TestValidator.predicate(
    "new access token differs from original",
    renewed.token.access !== authorized.token.access,
  );
  TestValidator.predicate(
    "new refresh token differs from original",
    renewed.token.refresh !== authorized.token.refresh,
  );
}
