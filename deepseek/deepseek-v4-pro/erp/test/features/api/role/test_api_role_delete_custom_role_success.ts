import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPermission";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_roles_create } from "../../../generate/generate_random_erp_hrm_roles_create";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

/**
 * Test successful deletion of a custom role with no assigned employees.
 *
 * Validates that an organization Owner can create a custom role and then soft-delete it when no employees hold that role. The custom role is created with a randomized name, description, and a non-empty permission set, then verified to have is_builtin set to false and deleted_at initially null before being deleted through the erase endpoint.
 *
 * The erase operation on the custom role should succeed without error, confirming that the soft-delete is permitted for custom roles that have no active employee assignments.
 *
 * 1. Organization Owner authenticates via member join.
 * 2. Owner creates a custom role with random permissions.
 * 3. Validates the created role is not built-in, not yet deleted, and has permissions.
 * 4. Owner deletes the custom role successfully.
 */
export async function test_api_role_delete_custom_role_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as Owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create custom role
  const role = await generate_random_erp_hrm_roles_create(ownerConnection, {});
  typia.assert(role);
  // 3. Validate role is custom (not built-in) and not yet deleted
  TestValidator.predicate("role is not built-in", role.is_builtin === false);
  TestValidator.equals("role not deleted", role.deleted_at, null);
  TestValidator.predicate("role has permissions", role.permissions.length > 0);
  // 4. Delete the custom role
  await api.functional.erpHrm.roles.erase(ownerConnection, {
    roleId: role.id,
  });
}
