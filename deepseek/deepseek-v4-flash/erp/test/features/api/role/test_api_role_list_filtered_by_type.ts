import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRolePermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_organizations_roles_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_roles_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_role } from "../../../prepare/prepare_random_hrm_time_tracking_role";

export async function test_api_role_list_filtered_by_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create an organization (auto-seeds built-in roles: Owner, Manager, Employee)
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create custom roles
  const customRole1 =
    await generate_random_hrm_time_tracking_member_organizations_roles_create(
      memberConnection,
      {
        params: { organizationId: organization.id },
      },
    );
  typia.assert(customRole1);
  const customRole2 =
    await generate_random_hrm_time_tracking_member_organizations_roles_create(
      memberConnection,
      {
        params: { organizationId: organization.id },
      },
    );
  typia.assert(customRole2);
  // 4. Call PATCH with type='built_in'
  const builtInRoles =
    await api.functional.hrmTimeTracking.member.organizations.roles.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          type: "built_in" as const,
          page: 1,
          limit: 100,
        } satisfies IHrmTimeTrackingRole.IRequest,
      },
    );
  typia.assert(builtInRoles);
  // Validate built-in roles
  TestValidator.equals("built-in role count", builtInRoles.data.length, 3);
  for (const role of builtInRoles.data) {
    TestValidator.equals("role type is built_in", role.type, "built_in");
  }
  // 5. Call PATCH with type='custom'
  const customRoles =
    await api.functional.hrmTimeTracking.member.organizations.roles.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          type: "custom" as const,
          page: 1,
          limit: 100,
        } satisfies IHrmTimeTrackingRole.IRequest,
      },
    );
  typia.assert(customRoles);
  // Validate custom roles
  TestValidator.equals("custom role count", customRoles.data.length, 2);
  for (const role of customRoles.data) {
    TestValidator.equals("role type is custom", role.type, "custom");
  }
  // Validate no overlap between built-in and custom role names
  const builtInNames = builtInRoles.data.map((r) => r.name);
  const customNames = customRoles.data.map((r) => r.name);
  for (const name of builtInNames) {
    TestValidator.predicate(
      "no name overlap with custom roles",
      !customNames.includes(name),
    );
  }
  // Validate pagination metadata
  TestValidator.predicate(
    "built-in pagination current > 0",
    builtInRoles.pagination.current > 0,
  );
  TestValidator.predicate(
    "custom pagination current > 0",
    customRoles.pagination.current > 0,
  );
}
