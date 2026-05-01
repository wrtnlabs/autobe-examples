import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test that the guest refresh endpoint rejects tampered JWT refresh tokens.
 *
 * Validates that the system cryptographically verifies JWT refresh tokens rather than accepting arbitrary strings. A guest session is first established via the join endpoint to obtain a valid refresh token, which is then deliberately modified by altering a single character. When the tampered token is submitted to the refresh endpoint, the system must detect the invalid JWT signature and return a 401 Unauthorized response.
 *
 * 1. Guest establishes a session via join, obtaining a valid access and refresh token pair.
 * 2. The refresh token is tampered with by changing one character.
 * 3. The tampered token is submitted to the refresh endpoint on a fresh connection.
 * 4. The system rejects the tampered token with a 401 status, confirming JWT signature verification is enforced.
 */
export async function test_api_guest_refresh_tampered_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Establish guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {});
  typia.assert(authorized);
  // 2. Tamper with the refresh token
  const validToken = authorized.token.refresh;
  const tamperedToken =
    validToken.slice(0, -1) +
    (validToken[validToken.length - 1] === "A" ? "B" : "A");
  // 3. Submit tampered token - expect 401
  const tamperedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "tampered refresh token rejected",
    401,
    async () => {
      await authorize_guest_refresh(tamperedConnection, {
        body: { refresh: tamperedToken },
      });
    },
  );
}
