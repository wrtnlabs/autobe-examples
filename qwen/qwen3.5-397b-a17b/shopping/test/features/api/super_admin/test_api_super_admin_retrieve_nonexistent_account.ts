import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test that attempting to retrieve a non-existent super administrator account
 * returns appropriate error response.
 *
 * This test validates that the system correctly handles attempts to access
 * non-existent super administrator accounts by returning HTTP 404.
 *
 * Test Flow:
 * 1. Register a super administrator account to establish authentication context
 * 2. Generate a valid UUID that does not correspond to any existing super admin
 * 3. Attempt to retrieve the non-existent super admin
 * 4. Validate HTTP 404 error response is returned
 */
export async function test_api_super_admin_retrieve_nonexistent_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator to establish authentication context
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  // 2. Generate a valid UUID that does not correspond to any existing super admin
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3 & 4. Attempt to retrieve non-existent super admin and validate 404 error
  await TestValidator.httpError(
    "non-existent super admin returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.superAdmin.super_admins.at(
        superAdminConnection,
        {
          superAdminId: nonExistentId,
        },
      );
    },
  );
}
