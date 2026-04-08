import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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

/**
 * Test that retrieving details for a non-existent administrator returns a 404 error.
 *
 * Validates the super admin's ability to query administrator information and confirms
 * that the system properly handles requests for administrators that do not exist in
 * the database. This test ensures proper error handling when an invalid adminId is
 * provided, returning a 404 status with an appropriate error message.
 *
 * 1. Authenticate as a super administrator using the join utility.
 * 2. Generate a random UUID that does not exist in the system.
 * 3. Call GET /ecommerceMall/superAdmin/admins/{nonExistentUuid}.
 * 4. Validate that the response returns a 404 error status with "Administrator not found" message.
 */
export async function test_api_superadmin_admin_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Generate a non-existent UUID
  const nonExistentAdminId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve admin details for non-existent ID
  // 4. Validate 404 error is returned
  await TestValidator.httpError(
    "admin not found returns 404",
    404,
    async () => {
      await api.functional.ecommerceMall.superAdmin.admins.at(
        superAdminConnection,
        {
          adminId: nonExistentAdminId,
        },
      );
    },
  );
}
