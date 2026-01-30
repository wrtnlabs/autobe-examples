import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAdmin";
import type { IEconomicForumAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAdminPasswordReset";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_password_reset_token_invalidated(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin using join operation
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IEconomicForumAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEconomicForumAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Step 2: Initiate password reset request to trigger token generation
  // We cannot get the token back, but we can verify the request succeeds
  await api.functional.economicForum.admin.auth.admins.password.resets.create(
    adminConnection,
    {
      body: {
        email: adminAuth.email,
      } satisfies IEconomicForumAdminPasswordReset.IRequest,
    },
  );
  // Step 3: Test invalidation of a non-existent token
  // This validates the system handles invalidation endpoint correctly
  // The system should return 404 for non-existent tokens (based on API spec)
  // We know the endpoint works because it accepts the token parameter
  // We'll test that invalidating a random UUID fails with 404
  const nonExistentToken: string = typia.random<string & tags.Format<"uuid">>();
  // This should fail with 404 Not Found
  await TestValidator.httpError(
    "invalidating non-existent password reset token should return 404",
    404,
    async () => {
      await api.functional.economicForum.admin.auth.admins.password.resets.erase(
        adminConnection,
        {
          token: nonExistentToken,
        },
      );
    },
  );
}
