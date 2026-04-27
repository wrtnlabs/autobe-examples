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

export async function test_api_role_list_searched_by_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create an organization (auto-seeds built-in roles: Owner, Manager, Employee)
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create custom roles with distinctive names
  // 3.1. "Senior Manager" — contains "manager" (case-insensitive)
  const seniorManagerRole =
    await generate_random_hrm_time_tracking_member_organizations_roles_create(
      memberConnection,
      {
        params: { organizationId: organization.id },
        body: {
          name: "Senior Manager",
          permissions: ["employee:view", "time:view_all"],
        },
      },
    );
  typia.assert(seniorManagerRole);
  // 3.2. "Design Lead" — contains "lead" (case-insensitive)
  const designLeadRole =
    await generate_random_hrm_time_tracking_member_organizations_roles_create(
      memberConnection,
      {
        params: { organizationId: organization.id },
        body: {
          name: "Design Lead",
          permissions: ["project:view", "time:manage"],
        },
      },
    );
  typia.assert(designLeadRole);
  // 4. Search for "manager" — should return built-in Manager + Senior Manager
  const managerResults: IPageIHrmTimeTrackingRole.ISummary =
    await api.functional.hrmTimeTracking.member.organizations.roles.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          search: "manager",
          page: 1,
          limit: 20,
        } satisfies IHrmTimeTrackingRole.IRequest,
      },
    );
  typia.assert(managerResults);
  // Validate that "manager" search returns at least 2 roles (Manager + Senior Manager)
  const managerRoleNames = managerResults.data.map((r) => r.name.toLowerCase());
  TestValidator.predicate(
    `'manager' search should include built-in Manager role`,
    managerRoleNames.includes("manager"),
  );
  TestValidator.predicate(
    `'manager' search should include 'Senior Manager' role`,
    managerRoleNames.includes("senior manager"),
  );
  TestValidator.predicate(
    `'manager' search should NOT include 'Design Lead'`,
    !managerRoleNames.includes("design lead"),
  );
  TestValidator.predicate(
    `'manager' search total records >= 2`,
    managerResults.pagination.records >= 2,
  );
  // 5. Search for "lead" — should return only Design Lead
  const leadResults: IPageIHrmTimeTrackingRole.ISummary =
    await api.functional.hrmTimeTracking.member.organizations.roles.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          search: "lead",
          page: 1,
          limit: 20,
        } satisfies IHrmTimeTrackingRole.IRequest,
      },
    );
  typia.assert(leadResults);
  // Validate that "lead" search returns Design Lead but NOT Manager/Senior Manager
  const leadRoleNames = leadResults.data.map((r) => r.name.toLowerCase());
  TestValidator.predicate(
    `'lead' search should include 'Design Lead' role`,
    leadRoleNames.includes("design lead"),
  );
  TestValidator.predicate(
    `'lead' search should NOT include 'Manager'`,
    !leadRoleNames.includes("manager"),
  );
  TestValidator.predicate(
    `'lead' search should NOT include 'Senior Manager'`,
    !leadRoleNames.includes("senior manager"),
  );
  TestValidator.predicate(
    `'lead' search records >= 1`,
    leadResults.pagination.records >= 1,
  );
}
