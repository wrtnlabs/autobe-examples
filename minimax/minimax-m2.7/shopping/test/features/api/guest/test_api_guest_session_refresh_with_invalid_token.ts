import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_refresh_with_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a valid guest session first using utility function
  const validGuestSession = await authorize_guest_join(connection, {});
  // 2. Test that refresh fails with invalid/malformed refresh token
  // Using a random string that is NOT a valid refresh token
  const invalidRefreshToken = RandomGenerator.alphaNumeric(32);
  await TestValidator.error("invalid random refresh token", async () => {
    await api.functional.ecommerceMall.auth.guest.refresh(connection, {
      body: {
        refreshToken: invalidRefreshToken,
      } satisfies IEcommerceMallGuest.IRefresh,
    });
  });
  // 3. Test with empty string refresh token
  await TestValidator.error("empty string refresh token", async () => {
    await api.functional.ecommerceMall.auth.guest.refresh(connection, {
      body: {
        refreshToken: "",
      } satisfies IEcommerceMallGuest.IRefresh,
    });
  });
  // 4. Test with tampered/modified refresh token (valid format but doesn't exist)
  const tamperedToken = validGuestSession.token.refresh.slice(0, -4) + "XXXX";
  await TestValidator.error("tampered refresh token", async () => {
    await api.functional.ecommerceMall.auth.guest.refresh(connection, {
      body: {
        refreshToken: tamperedToken,
      } satisfies IEcommerceMallGuest.IRefresh,
    });
  });
  // 5. Test with null/undefined-like invalid token
  await TestValidator.error("invalid token format", async () => {
    await api.functional.ecommerceMall.auth.guest.refresh(connection, {
      body: {
        refreshToken: "not-a-valid-uuid-format-at-all-12345",
      } satisfies IEcommerceMallGuest.IRefresh,
    });
  });
}
