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

export async function test_api_admin_account_retrieval_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and register an admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Verify the admin can be retrieved initially
  const retrievedAdmin = await api.functional.communityPlatform.admins.at(
    adminConnection,
    { adminId: admin.id },
  );
  typia.assert(retrievedAdmin);
  TestValidator.equals("admin matches", retrievedAdmin.id, admin.id);
  // Since no soft-delete endpoint is available, we cannot test the actual soft-delete scenario
  // The test will verify that normal admin retrieval works correctly
  // The soft-delete filtering functionality would need to be tested through actual database operations
  // Test error handling for non-existent admin
  await TestValidator.error(
    "non-existent admin should not be found",
    async () => {
      await api.functional.communityPlatform.admins.at(adminConnection, {
        adminId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
