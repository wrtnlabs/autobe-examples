import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_login_email_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create new connection specific to super administrator login
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Prepare login credentials with an unregistered email and any password
  const body: IDiscussionBoardSuperAdministrator.ILogin = {
    email: `nonexistent_${Date.now()}@example.com`,
    password: "any-password-123",
  } satisfies IDiscussionBoardSuperAdministrator.ILogin;
  // Expect error when logging in because email does not exist
  await TestValidator.error(
    "super administrator login with non-existent email should fail",
    async () => {
      await authorize_super_administrator_login(superAdminConnection, { body });
    },
  );
}
