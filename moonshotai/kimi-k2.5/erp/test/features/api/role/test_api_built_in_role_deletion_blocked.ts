import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
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
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

/**
 * Test that built-in roles cannot be deleted.
 *
 * Built-in/system roles are essential for platform operation and should
 * be protected from deletion attempts. This test verifies that the API
 * correctly blocks deletion of protected roles.
 *
 * Steps:
 * 1. Member authenticates
 * 2. Create an organization (generates built-in roles automatically)
 * 3. List roles to find built-in roles
 * 4. Attempt to delete a built-in role
 * 5. Verify deletion is blocked with an error
 */
export async function test_api_built_in_role_deletion_blocked(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection and register
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create an organization (auto-generates built-in roles)
  await generate_random_erp_hrm_member_organizations_create(memberConnection, {
    body: {},
  });
  // Step 3: List roles to find built-in roles
  const rolesPage: IPageIErpHrmRole.ISummary =
    await api.functional.erpHrm.member.roles.index(memberConnection, {
      body: {
        name: null,
        is_builtin: null,
        created_at_from: null,
        created_at_to: null,
        sort: null,
        page: null,
        limit: null,
      } satisfies IErpHrmRole.IRequest,
    });
  typia.assert(rolesPage);
  // Find a built-in role (is_builtin should be true for Owner, Manager, Employee)
  const builtInRole = rolesPage.data.find(
    (role: IErpHrmRole.ISummary) => role.is_builtin === true,
  );
  if (!builtInRole) {
    throw new Error("No built-in role found");
  }
  // Step 4: Attempt to delete the built-in role - should fail
  await TestValidator.error("built-in role deletion blocked", async () => {
    await api.functional.erpHrm.member.roles.erase(memberConnection, {
      roleId: builtInRole.id,
    });
  });
}
