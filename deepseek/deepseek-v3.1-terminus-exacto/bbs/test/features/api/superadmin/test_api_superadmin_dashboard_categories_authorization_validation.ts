import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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

/**
 * Test authorization validation for superadmin dashboard categories endpoint.
 * Validates that only super administrators can access sensitive section management data.
 * Tests proper access control enforcement and authorization error handling.
 */
export async function test_api_superadmin_dashboard_categories_authorization_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account and authenticate using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorizedSuperAdmin = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(authorizedSuperAdmin);
  // 2. Access dashboard categories with authenticated super admin (should succeed)
  const categories =
    await api.functional.discussionBoard.superAdmin.dashboard.categories.at(
      superAdminConnection,
    );
  typia.assert(categories);
  // 3. Attempt to access dashboard categories with base connection (should fail)
  await TestValidator.error(
    "unauthorized access to superadmin dashboard categories",
    async () => {
      await api.functional.discussionBoard.superAdmin.dashboard.categories.at(
        connection,
      );
    },
  );
}
