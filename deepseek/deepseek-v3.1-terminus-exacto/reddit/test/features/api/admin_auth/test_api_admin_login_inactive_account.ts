import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_inactive_account(
  connection: api.IConnection,
): Promise<void> {
  // Required imports within function scope
  const { TestValidator } = await import("@nestia/e2e");
  const typia = await import("typia");
  const { RandomGenerator } = await import("@nestia/e2e");
  // Create admin account using utility function
  const joinConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testPassword123",
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Create fresh connection for login attempt
  const loginConnection: api.IConnection = { host: connection.host };
  // Attempt login - should fail due to account status
  await TestValidator.httpError(
    "login should fail with 403 Forbidden",
    403,
    async () => {
      await api.functional.communityPlatform.auth.admin.login(loginConnection, {
        body: {
          email: admin.email,
          password: "testPassword123",
        } satisfies ICommunityPlatformAdmin.ILogin,
      });
    },
  );
}
