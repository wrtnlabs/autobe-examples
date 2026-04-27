import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_refresh_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // Create a fresh guest connection (no authentication needed for this test)
  const guestConnection: api.IConnection = { host: connection.host };
  // Test 1: Completely invalid token string (not a JWT at all)
  await TestValidator.httpError(
    "should reject invalid refresh token with 401",
    401,
    async () => {
      await authorize_guest_refresh(guestConnection, {
        body: {
          refresh: "not-a-valid-jwt-token",
        } satisfies ICommunityPlatformGuest.IRefresh,
      });
    },
  );
  // Test 2: Tampered JWT (valid base64url structure but invalid signature)
  await TestValidator.httpError(
    "should reject tampered JWT with 401",
    401,
    async () => {
      await authorize_guest_refresh(guestConnection, {
        body: {
          refresh:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.tampered-signature",
        } satisfies ICommunityPlatformGuest.IRefresh,
      });
    },
  );
}
