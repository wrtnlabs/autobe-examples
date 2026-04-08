import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator token refresh with expired refresh token.
 *
 * Validates the refresh token expiration validation logic by attempting to use an invalid refresh token to renew the session. This test ensures that expired or invalid refresh tokens are properly rejected and cannot be used to obtain new access tokens.
 *
 * The test follows these steps:
 * 1. Register a new administrator account to obtain initial tokens
 * 2. Create an invalid refresh token (simulating expired token scenario)
 * 3. Attempt to refresh using the invalid token
 * 4. Verify the refresh request is rejected with appropriate error
 * 5. Confirm no new tokens are issued
 *
 * This validates the security mechanism that prevents unauthorized session renewal through expired or compromised refresh tokens.
 */
export async function test_api_admin_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin to obtain initial tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(authorized);
  // 2. Attempt to refresh with invalid/expired token
  const invalidRefreshToken =
    "invalid_refresh_token_" + RandomGenerator.alphaNumeric(32);
  await TestValidator.error(
    "invalid refresh token should be rejected",
    async () => {
      await authorize_admin_refresh(adminConnection, {
        body: {
          refresh: invalidRefreshToken,
        } satisfies IEcommerceAdmin.IRefresh,
      });
    },
  );
}
