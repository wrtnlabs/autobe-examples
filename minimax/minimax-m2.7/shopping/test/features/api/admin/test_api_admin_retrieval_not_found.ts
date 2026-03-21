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
 * Test that retrieving a non-existent administrator returns 404 Not Found.
 *
 * 1. Authenticate as superAdmin by calling POST /ecommerceMall/auth/superAdmin/join
 * 2. Attempt to retrieve an admin using a non-existent UUID: 00000000-0000-0000-0000-000000000000
 * 3. Validate response status is 404 Not Found
 * 4. Verify response body contains appropriate error message indicating administrator not found
 */
export async function test_api_admin_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Attempt to retrieve non-existent admin
  const nonExistentAdminId = "00000000-0000-0000-0000-000000000000" as string &
    tags.Format<"uuid">;
  // 3. Validate 404 Not Found response
  await TestValidator.httpError(
    "non-existent admin returns 404",
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
