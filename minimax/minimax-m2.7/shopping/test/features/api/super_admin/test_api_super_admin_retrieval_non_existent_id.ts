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
 * Test that requesting a non-existent super administrator account ID returns 404 Not Found.
 *
 * Validates the API behavior when attempting to retrieve a super administrator account that does not exist. This test ensures that:
 * - A super administrator must be authenticated to access the endpoint
 * - The API correctly returns 404 Not Found for non-existent account IDs
 * - The error response properly indicates the account was not found
 * - Existing active super admin accounts remain accessible
 *
 * 1. Register a super administrator using join endpoint to create authentication context
 * 2. Generate a valid UUID that does not correspond to any existing super admin
 * 3. Attempt to retrieve the non-existent super admin via GET endpoint
 * 4. Validate that 404 Not Found error is returned
 * 5. Verify the created super admin can still be retrieved successfully
 */
export async function test_api_super_admin_retrieval_non_existent_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a super administrator to create authentication context
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorizedSuperAdmin = await authorize_super_admin_join(
    superAdminConnection,
    {},
  );
  // 2. Generate a valid UUID that does not correspond to any existing super admin
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the non-existent super admin
  // 4. Validate that 404 Not Found error is returned
  await TestValidator.httpError(
    "non-existent super admin returns 404",
    404,
    async () => {
      await api.functional.ecommerceMall.superAdmin.super_admin.super_admins.at(
        superAdminConnection,
        {
          superAdminId: nonExistentId,
        },
      );
    },
  );
  // 5. Verify the created super admin can still be retrieved successfully
  const existingSuperAdmin =
    await api.functional.ecommerceMall.superAdmin.super_admin.super_admins.at(
      superAdminConnection,
      {
        superAdminId: authorizedSuperAdmin.id,
      },
    );
  typia.assert(existingSuperAdmin);
  TestValidator.equals(
    "retrieved super admin matches created",
    existingSuperAdmin.id,
    authorizedSuperAdmin.id,
  );
  TestValidator.equals(
    "retrieved email matches",
    existingSuperAdmin.email,
    authorizedSuperAdmin.email,
  );
}
