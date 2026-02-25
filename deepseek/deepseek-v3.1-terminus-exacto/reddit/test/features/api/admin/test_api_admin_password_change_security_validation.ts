import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_password_change_security_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create admin account using available utility function
  const adminCredentials: ICommunityPlatformAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "OldPassword123!",
    display_name: RandomGenerator.name(),
    permissions_level: null,
  };
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(admin);
  // Create a separate connection with the admin's token
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: admin.token.access,
    },
  };
  // Perform password change with complex new password
  const passwordChange: ICommunityPlatformUser.IChangePassword = {
    current_password: "OldPassword123!",
    new_password: "NewComplexPassword456!",
  };
  // Change password
  await api.functional.communityPlatform.admin.password.updatePassword(
    authorizedConnection,
    {
      body: passwordChange,
    },
  );
  // Verify old credentials no longer work by attempting login with old password
  await TestValidator.error("old credentials should fail", async () => {
    const oldAuthConnection: api.IConnection = { host: connection.host };
    // Use SDK directly since authorize_admin_login utility is not available
    await api.functional.communityPlatform.auth.admin.login(oldAuthConnection, {
      body: {
        email: adminCredentials.email,
        password: adminCredentials.password,
      },
    });
  });
  // Verify new credentials work
  const newAuthConnection: api.IConnection = { host: connection.host };
  const newAdmin = await api.functional.communityPlatform.auth.admin.login(
    newAuthConnection,
    {
      body: {
        email: adminCredentials.email,
        password: passwordChange.new_password,
      },
    },
  );
  typia.assert(newAdmin);
  // Verify old token no longer works by attempting to use it
  await TestValidator.error("old token should be invalid", async () => {
    await api.functional.communityPlatform.admin.password.updatePassword(
      authorizedConnection,
      {
        body: {
          current_password: passwordChange.new_password,
          new_password: "AnotherNewPassword789!",
        } satisfies ICommunityPlatformUser.IChangePassword,
      },
    );
  });
}
