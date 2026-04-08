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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test that attempting to retrieve a non-existent administrator account returns 404 Not Found.
 *
 * Validates proper error handling when querying for an administrator that does not exist in the system. This test ensures the API correctly returns a 404 status code when given an invalid or non-existent admin ID, which is essential for preventing information leakage about valid admin accounts.
 *
 * The test authenticates as a super administrator (required permission level), generates a random UUID that doesn't exist, attempts to retrieve the admin details, and verifies the expected 404 response.
 *
 * 1. Authenticate as a super administrator to obtain proper authorization.
 * 2. Generate a random non-existent UUID for the adminId parameter.
 * 3. Call the GET endpoint with the non-existent UUID.
 * 4. Validate that a 404 Not Found error is returned.
 */
export async function test_api_admin_details_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Generate a non-existent UUID
  const nonExistentAdminId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve non-existent admin - should return 404
  await TestValidator.httpError(
    "non-existent admin returns 404",
    404,
    async () => {
      await api.functional.ecommerceMall.admin.admin.admins.at(
        superAdminConnection,
        {
          adminId: nonExistentAdminId,
        },
      );
    },
  );
}
