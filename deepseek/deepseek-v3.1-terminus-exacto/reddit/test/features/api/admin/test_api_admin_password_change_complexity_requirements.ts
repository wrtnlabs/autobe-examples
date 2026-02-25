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

export async function test_api_admin_password_change_complexity_requirements(
  connection: api.IConnection,
): Promise<void> {
  // Create admin account with valid password
  const adminConnection: api.IConnection = { host: connection.host };
  const initialPassword = "ValidPassword123!";
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: initialPassword,
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Test invalid password: too short
  await TestValidator.error("password too short", async () => {
    await api.functional.communityPlatform.admin.password.updatePassword(
      adminConnection,
      {
        body: {
          current_password: initialPassword,
          new_password: "Short1!",
        } satisfies ICommunityPlatformUser.IChangePassword,
      },
    );
  });
  // Test invalid password: no uppercase
  await TestValidator.error("password missing uppercase", async () => {
    await api.functional.communityPlatform.admin.password.updatePassword(
      adminConnection,
      {
        body: {
          current_password: initialPassword,
          new_password: "lowercase123!",
        } satisfies ICommunityPlatformUser.IChangePassword,
      },
    );
  });
  // Test invalid password: no lowercase
  await TestValidator.error("password missing lowercase", async () => {
    await api.functional.communityPlatform.admin.password.updatePassword(
      adminConnection,
      {
        body: {
          current_password: initialPassword,
          new_password: "UPPERCASE123!",
        } satisfies ICommunityPlatformUser.IChangePassword,
      },
    );
  });
  // Test invalid password: no numbers
  await TestValidator.error("password missing numbers", async () => {
    await api.functional.communityPlatform.admin.password.updatePassword(
      adminConnection,
      {
        body: {
          current_password: initialPassword,
          new_password: "NoNumbers!",
        } satisfies ICommunityPlatformUser.IChangePassword,
      },
    );
  });
  // Test invalid password: no special characters
  await TestValidator.error("password missing special characters", async () => {
    await api.functional.communityPlatform.admin.password.updatePassword(
      adminConnection,
      {
        body: {
          current_password: initialPassword,
          new_password: "NoSpecial123",
        } satisfies ICommunityPlatformUser.IChangePassword,
      },
    );
  });
  // Test valid complex password
  await api.functional.communityPlatform.admin.password.updatePassword(
    adminConnection,
    {
      body: {
        current_password: initialPassword,
        new_password: "NewValidPassword456@",
      } satisfies ICommunityPlatformUser.IChangePassword,
    },
  );
  TestValidator.predicate("password successfully changed", true);
}
