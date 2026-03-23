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
import { generate_random_hrm_platform_admin_roles_create } from "../../../generate/generate_random_hrm_platform_admin_roles_create";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";

/**
 * Test retrieving a custom role created by an organization owner.
 * Validates that custom roles can be successfully retrieved with all
 * expected fields including permissions, organization reference, and
 * custom role indicators (is_builtin=false, built_in_type=null).
 */
export async function test_api_role_retrieve_custom_role_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a custom role with specific permissions
  const customRole = await generate_random_hrm_platform_admin_roles_create(
    adminConnection,
    {},
  );
  typia.assert(customRole);
  // 3. Retrieve the custom role by ID
  const retrievedRole = await api.functional.hrmPlatform.admin.roles.at(
    adminConnection,
    {
      roleId: customRole.id,
    },
  );
  typia.assert(retrievedRole);
  // 4. Validate custom role properties
  TestValidator.equals("role id matches", retrievedRole.id, customRole.id);
  TestValidator.equals(
    "role name matches",
    retrievedRole.name,
    customRole.name,
  );
  TestValidator.equals(
    "role description matches",
    retrievedRole.description,
    customRole.description,
  );
  TestValidator.equals("is_builtin is false", retrievedRole.is_builtin, false);
  TestValidator.equals(
    "built_in_type is null",
    retrievedRole.built_in_type,
    null,
  );
  TestValidator.equals(
    "permissions match",
    retrievedRole.permissions,
    customRole.permissions,
  );
  TestValidator.predicate(
    "organization exists",
    retrievedRole.organization.id !== undefined,
  );
  TestValidator.predicate(
    "created_at exists",
    retrievedRole.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedRole.updated_at !== undefined,
  );
}
