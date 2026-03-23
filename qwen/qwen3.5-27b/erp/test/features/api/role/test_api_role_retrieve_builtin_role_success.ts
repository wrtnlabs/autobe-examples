import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_role_retrieve_builtin_role_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Generate a valid UUID for a built-in role
  const roleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the built-in role
  const role: IHrmPlatformRole =
    await api.functional.hrmPlatform.admin.roles.at(adminConnection, {
      roleId,
    });
  // 4. Validate response structure
  typia.assert(role);
  // 5. Verify built-in role properties
  TestValidator.predicate("is_builtin is true", role.is_builtin === true);
  TestValidator.predicate(
    "built_in_type is not null",
    role.built_in_type !== null,
  );
  TestValidator.predicate(
    "built_in_type is valid",
    ["Owner", "Manager", "Employee"].includes(role.built_in_type!),
  );
  // 6. Verify role has required fields
  TestValidator.predicate("role has valid id", role.id !== undefined);
  TestValidator.predicate("role has name", role.name !== undefined);
  TestValidator.predicate("role has created_at", role.created_at !== undefined);
  TestValidator.predicate("role has updated_at", role.updated_at !== undefined);
  // 7. Verify permissions array exists
  TestValidator.predicate(
    "permissions is an array",
    Array.isArray(role.permissions),
  );
  TestValidator.predicate(
    "permissions contains unique items",
    role.permissions.length === new Set(role.permissions).size,
  );
  // 8. Verify organization reference
  TestValidator.predicate(
    "organization exists",
    role.organization !== undefined,
  );
  TestValidator.predicate(
    "organization has valid id",
    role.organization.id !== undefined,
  );
  TestValidator.predicate(
    "organization has name",
    role.organization.name !== undefined,
  );
  TestValidator.predicate(
    "organization has owner",
    role.organization.owner !== undefined,
  );
  TestValidator.predicate(
    "organization has setting",
    role.organization.setting !== undefined,
  );
  TestValidator.predicate(
    "organization has logo",
    role.organization.logo !== undefined,
  );
}
