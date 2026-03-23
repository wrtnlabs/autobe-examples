import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test organization deletion endpoint behavior.
 *
 * Note: This test attempts to delete an organization but cannot fully test
 * the "blocked by active contracts" business rule because the required
 * APIs for creating organizations, employees, and contracts are not available
 * in the provided SDK functions.
 *
 * This test verifies:
 * 1. Admin authentication works
 * 2. The deletion endpoint exists and responds
 * 3. Deletion of non-existent organization fails appropriately
 */
export async function test_api_organization_deletion_blocked_by_active_contracts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Generate a random organization ID (non-existent)
  const nonExistentOrgId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to delete the non-existent organization
  // This should fail with an error (likely 404 Not Found)
  await TestValidator.error(
    "deletion of non-existent organization should fail",
    async () => {
      await api.functional.hrmPlatform.admin.organizations.erase(
        adminConnection,
        {
          organizationId: nonExistentOrgId,
        },
      );
    },
  );
  // 4. Verify the error is an HTTP error with appropriate status code
  // (404 for not found, or potentially 403 if permissions are wrong)
  await TestValidator.httpError(
    "deletion should return HTTP error",
    [404, 403, 400],
    async () => {
      await api.functional.hrmPlatform.admin.organizations.erase(
        adminConnection,
        {
          organizationId: nonExistentOrgId,
        },
      );
    },
  );
}
