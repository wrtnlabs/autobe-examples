import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
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
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_role_list_all_after_organization_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and create authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create an organization (auto-seeds built-in roles: Owner, Manager, Employee)
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. List all roles with default pagination (no search/filter criteria)
  const rolePage =
    await api.functional.hrmTimeTracking.member.organizations.roles.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {},
      },
    );
  typia.assert(rolePage);
  // 4. Validate pagination metadata
  TestValidator.equals("page number", rolePage.pagination.current, 1);
  TestValidator.equals("records count", rolePage.pagination.records, 3);
  TestValidator.predicate(
    "pages should be at least 1",
    rolePage.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "limit should be positive",
    rolePage.pagination.limit > 0,
  );
  // 5. Validate exactly 3 roles returned
  TestValidator.equals("number of roles", rolePage.data.length, 3);
  // 6. Extract role names and validate built-in roles are present
  const roleNames = rolePage.data.map((r) => r.name);
  const expectedNames = ["Owner", "Manager", "Employee"];
  for (const expectedName of expectedNames) {
    TestValidator.predicate(
      `role "${expectedName}" exists`,
      roleNames.includes(expectedName),
    );
  }
  // 7. Validate each role's properties
  for (const role of rolePage.data) {
    typia.assert(role);
    TestValidator.equals("role type is built_in", role.type, "built_in");
    TestValidator.equals("employees_count is 0", role.employees_count, 0);
    TestValidator.equals(
      "role belongs to organization",
      role.organization.id,
      organization.id,
    );
  }
}
