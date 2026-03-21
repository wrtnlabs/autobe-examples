import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_admin_roles_create } from "../../../generate/generate_random_erp_hrm_admin_roles_create";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_roles_summary_with_custom_roles(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - authenticate and create custom role
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // Create a unique custom role name using admin's email prefix to avoid conflicts
  const customRoleName = `CustomRole_${adminAuth.email.split("@")[0]}_${Date.now()}`;
  const customRole = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: customRoleName,
        permissions: ["project:view"],
      },
    },
  );
  typia.assert(customRole);
  // 2. Member setup - authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Call the roles summary endpoint as member
  const rolesSummary =
    await api.functional.erpHrm.member.roles.summary(memberConnection);
  typia.assert(rolesSummary);
  // The response is an array of IErpHrmRole.ISummary
  const roles = Array.isArray(rolesSummary) ? rolesSummary : [rolesSummary];
  // 4. Find the custom role in the response
  const customRoleInSummary = roles.find(
    (role) => role.name === customRoleName,
  );
  TestValidator.equals(
    "custom role exists in summary",
    customRoleInSummary !== undefined,
    true,
  );
  if (customRoleInSummary) {
    TestValidator.equals(
      "custom role is_builtin is false",
      customRoleInSummary.is_builtin,
      false,
    );
  }
  // 5. Validate built-in roles (Owner, Manager, Employee) have is_builtin = true
  const builtInRoleNames = ["Owner", "Manager", "Employee"];
  for (const builtInName of builtInRoleNames) {
    const builtInRole = roles.find((role) => role.name === builtInName);
    if (builtInRole) {
      TestValidator.equals(
        `built-in role ${builtInName} has is_builtin true`,
        builtInRole.is_builtin,
        true,
      );
    }
  }
  // 6. Verify ordering - built-in roles first (is_builtin DESC), then alphabetically by name ASC
  const isBuiltinOrder = roles.every((role, index) => {
    if (index === 0) return true;
    const prevRole = roles[index - 1];
    // If current role is builtin, previous must also be builtin
    if (role.is_builtin && !prevRole.is_builtin) return false;
    // If previous is not builtin and current is builtin, that's wrong order
    if (!prevRole.is_builtin && role.is_builtin) return false;
    return true;
  });
  TestValidator.predicate(
    "built-in roles appear before custom roles",
    isBuiltinOrder,
  );
}
