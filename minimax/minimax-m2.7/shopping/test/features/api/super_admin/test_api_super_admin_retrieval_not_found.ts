import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
 * Test retrieving a non-existent super administrator account returns 404 Not Found.
 *
 * Validates that the system correctly handles queries for super admin records that
 * don't exist. Ensures proper error response helps debugging and prevents information
 * leakage by returning 404 instead of exposing internal details.
 *
 * 1. Authenticate as super admin by registering a new super admin account.
 * 2. Call GET /superAdmin/super-admins/{superAdminId} with a random UUID that does not exist.
 * 3. Validates that HTTP 404 status is returned with appropriate error message.
 */
export async function test_api_super_admin_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Generate a random UUID that does not exist
  const nonExistentSuperAdminId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the non-existent super admin and expect 404
  await TestValidator.httpError(
    "should return 404 for non-existent super admin",
    404,
    async () =>
      await api.functional.ecommerceMall.superAdmin.super_admins.at(
        superAdminConnection,
        {
          superAdminId: nonExistentSuperAdminId,
        },
      ),
  );
}
