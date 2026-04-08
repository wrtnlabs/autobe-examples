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
 * Test that requesting details for a non-existent administrator returns HTTP 404 Not Found.
 *
 * Validates the boundary condition for invalid resource identifiers by attempting to retrieve an administrator with a UUID that does not exist in the system. A super administrator authenticates first, then calls the endpoint with a non-existent UUID. The system should return 404 status with an appropriate error message.
 *
 * 1. Super admin authenticates using authorize_super_admin_join utility.
 * 2. Generate random UUID that doesn't exist in the system.
 * 3. Call admin retrieval endpoint with non-existent UUID.
 * 4. Validate HTTP 404 error is returned.
 */
export async function test_api_admin_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Generate non-existent UUID (random UUID that won't exist in database)
  const nonExistentAdminId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call admin retrieval endpoint with non-existent UUID
  // 4. Validate HTTP 404 error is returned
  await TestValidator.httpError(
    "non-existent admin returns 404",
    404,
    async () =>
      api.functional.ecommerceMall.superAdmin.admin.admins.at(
        superAdminConnection,
        {
          adminId: nonExistentAdminId,
        },
      ),
  );
}
