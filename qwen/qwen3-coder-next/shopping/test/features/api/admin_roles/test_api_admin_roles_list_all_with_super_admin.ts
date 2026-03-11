import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_roles_list_all_with_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create new connection for admin registration
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 1: Register super admin with elevated privileges
  const superAdminResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(superAdminResult);
  // Step 2: List all admin roles with no filters (empty request body for default pagination)
  const rolesResult =
    await api.functional.ecommerceMall.admin.admin_roles.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(rolesResult);
  // Step 3: Validate the response structure
  TestValidator.equals("pagination exists", rolesResult.pagination.current, 1);
  TestValidator.predicate("has records", rolesResult.pagination.records >= 1);
  TestValidator.equals(
    "has at least one admin role",
    rolesResult.data.length >= 1,
    true,
  );
  // Step 4: Validate super admin role exists in results
  const superAdminRole = rolesResult.data.find(
    (role) => role.grade === "super",
  );
  TestValidator.equals(
    "super admin role exists",
    superAdminRole !== undefined,
    true,
  );
  // Step 5: Validate role structure
  if (superAdminRole) {
    TestValidator.equals("has correct grade", superAdminRole.grade, "super");
    TestValidator.predicate(
      "has created_at",
      superAdminRole.created_at !== undefined,
    );
    TestValidator.predicate(
      "has updated_at",
      superAdminRole.updated_at !== undefined,
    );
  }
}
