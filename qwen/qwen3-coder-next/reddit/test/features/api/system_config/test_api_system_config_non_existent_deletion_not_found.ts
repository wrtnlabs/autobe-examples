import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_config_non_existent_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "admin1234",
      username: "admin_user",
      display_name: "Admin User",
      bio: null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  // Attempt to delete non-existent configuration
  // This should return 404 Not Found
  await TestValidator.error(
    "deletion of non-existent config returns 404",
    async () => {
      await api.functional.redditPlatform.admin.system_configs.erase(
        adminConnection,
        {
          configKey: "non_existent_config_key",
        },
      );
    },
  );
}
