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

/**
 * Test that the refresh endpoint rejects fabricated, non-existent refresh tokens.
 *
 * Validates the security boundary of the token refresh mechanism by proving that
 * arbitrary, randomly generated tokens cannot be used to obtain authenticated
 * access. The system must look up the provided refresh_token in the
 * erp_hrm_member_sessions table and return 401 when no matching record exists.
 *
 * This test also implicitly validates that the refresh endpoint does not have
 * any fallback or default behavior that could allow token forgery — a completely
 * fabricated token must always result in rejection.
 *
 * 1. Register a guest account to establish that valid sessions can be created.
 * 2. Attempt to refresh with a randomly generated, non-existent refresh token.
 * 3. Verify the system returns 401 Unauthorized for the invalid token.
 */
export async function test_api_refresh_token_invalid(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a guest to establish auth context (proves valid sessions exist)
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {});
  // 2. Attempt to refresh with a completely fabricated, non-existent refresh token
  await TestValidator.httpError(
    "fabricated refresh token returns 401",
    401,
    async () => {
      const invalidConnection: api.IConnection = { host: connection.host };
      await authorize_guest_refresh(invalidConnection, {
        body: {
          refresh_token: RandomGenerator.alphaNumeric(64),
        } satisfies IErpHrmGuest.IRefresh,
      });
    },
  );
}
