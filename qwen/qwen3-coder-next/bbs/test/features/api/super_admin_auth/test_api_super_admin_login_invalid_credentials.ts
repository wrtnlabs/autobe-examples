import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_login_invalid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for super admin operations
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Attempt login with invalid credentials (non-existent email and random password)
  await TestValidator.error(
    "super admin login should fail with invalid credentials",
    async () => {
      await api.functional.discussionBoard.auth.superAdmin.login(
        superAdminConnection,
        {
          body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: typia.random<string & tags.Format<"password">>(),
          } satisfies IDiscussionBoardSuperAdmin.ILogin,
        },
      );
    },
  );
}
