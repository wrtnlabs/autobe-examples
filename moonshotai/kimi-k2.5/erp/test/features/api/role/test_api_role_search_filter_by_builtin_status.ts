import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";

/**
 * Test filtering roles by is_builtin status to distinguish built-in from custom roles.
 * Verifies that:
 * - is_builtin: true returns only system roles (Owner, Manager, Employee)
 * - is_builtin: false returns only custom user-defined roles
 * - is_builtin: null returns all roles
 * - Pagination records reflect correct filtered counts
 */
export async function test_api_role_search_filter_by_builtin_status(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Create organization (automatically creates 3 built-in roles: Owner, Manager, Employee)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Create a custom role
  const customRole = await generate_random_erp_hrm_member_roles_create(
    memberConnection,
    {},
  );
  typia.assert(customRole);
  // Verify custom role is not built-in
  TestValidator.equals(
    "custom role is not built-in",
    customRole.isBuiltin,
    false,
  );
  // Test filter is_builtin: true (should return only 3 built-in roles)
  const builtinResult = await api.functional.erpHrm.member.roles.index(
    memberConnection,
    {
      body: {
        name: null,
        is_builtin: true,
        created_at_from: null,
        created_at_to: null,
        sort: null,
        page: null,
        limit: null,
      } satisfies IErpHrmRole.IRequest,
    },
  );
  typia.assert(builtinResult);
  TestValidator.equals(
    "builtin filter returns 3 roles",
    builtinResult.pagination.records,
    3,
  );
  TestValidator.predicate(
    "all returned roles are built-in",
    builtinResult.data.every((role) => role.is_builtin === true),
  );
  // Test filter is_builtin: false (should return only the custom role)
  const customResult = await api.functional.erpHrm.member.roles.index(
    memberConnection,
    {
      body: {
        name: null,
        is_builtin: false,
        created_at_from: null,
        created_at_to: null,
        sort: null,
        page: null,
        limit: null,
      } satisfies IErpHrmRole.IRequest,
    },
  );
  typia.assert(customResult);
  TestValidator.equals(
    "custom filter returns 1 role",
    customResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "custom filter returns the created role name",
    customResult.data[0].name,
    customRole.name,
  );
  TestValidator.equals(
    "returned role is not built-in",
    customResult.data[0].is_builtin,
    false,
  );
  // Test filter is_builtin: null (should return all 4 roles)
  const allResult = await api.functional.erpHrm.member.roles.index(
    memberConnection,
    {
      body: {
        name: null,
        is_builtin: null,
        created_at_from: null,
        created_at_to: null,
        sort: null,
        page: null,
        limit: null,
      } satisfies IErpHrmRole.IRequest,
    },
  );
  typia.assert(allResult);
  TestValidator.equals(
    "no filter returns all 4 roles",
    allResult.pagination.records,
    4,
  );
}
