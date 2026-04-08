import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_login_with_nonexistent_email(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for this test
  const testConnection: api.IConnection = { host: connection.host };
  // Generate a non-existent email address that will never be registered
  const nonexistentEmail = typia.random<string & tags.Format<"email">>();
  // Attempt to login with non-existent email
  // System should return 401 Unauthorized without revealing whether email exists
  await TestValidator.httpError(
    "login with nonexistent email returns 401",
    401,
    async () => {
      await authorize_super_admin_login(testConnection, {
        body: {
          email: nonexistentEmail,
          password: RandomGenerator.alphaNumeric(12) as string &
            tags.Format<"password">,
        } satisfies IEcommerceMallSuperAdmin.ILogin,
      });
    },
  );
}
