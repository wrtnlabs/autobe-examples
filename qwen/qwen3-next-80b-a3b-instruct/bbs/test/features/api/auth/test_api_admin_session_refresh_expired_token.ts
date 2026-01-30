import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_session_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin account to obtain a valid refresh token
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEconomicForumAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEconomicForumAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Create an invalid refresh token (malformed string) to simulate an expired/invalid token
  const invalidRefreshToken = {
    token: "invalid-refresh-token-12345", // Malformed, invalid token
  } satisfies IEconomicForumAdmin.IRefresh;
  // Step 3: Attempt to refresh with invalid refresh token (should fail)
  await TestValidator.error(
    "refresh endpoint should reject invalid refresh token",
    async () => {
      await api.functional.economicForum.auth.admin.refresh(adminConnection, {
        body: invalidRefreshToken,
      });
    },
  );
}
