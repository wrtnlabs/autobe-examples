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
 * Test successful retrieval of an existing super administrator account.
 *
 * This test validates the GET /ecommerceMall/superAdmin/super-admins/{superAdminId} endpoint
 * by first creating a new super admin through the join endpoint, then retrieving the
 * account using its unique identifier. The test verifies that all required fields (id,
 * email, grade, createdAt, updatedAt, deletedAt) are present and correct, confirming the
 * account is active (deletedAt is null) and has the expected privilege level.
 */
export async function test_api_super_admin_at_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor-specific connection for super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  // 2. Create and authenticate super admin using utility function
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {},
  });
  typia.assert(authResult);
  // 3. Retrieve the super admin using its ID
  const superAdmin =
    await api.functional.ecommerceMall.superAdmin.super_admins.at(
      superAdminConnection,
      {
        superAdminId: authResult.id,
      },
    );
  typia.assert(superAdmin);
  // 4. Validate business logic
  TestValidator.equals(
    "email matches registered email",
    superAdmin.email,
    authResult.email,
  );
  TestValidator.equals("grade is super_admin", superAdmin.grade, "super_admin");
  TestValidator.predicate(
    "deletedAt is null for active account",
    superAdmin.deletedAt === null,
  );
}
