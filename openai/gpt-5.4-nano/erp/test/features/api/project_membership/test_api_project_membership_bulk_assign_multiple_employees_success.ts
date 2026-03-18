import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IErpHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProjectMembership";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_create";
import { generate_random_erp_hrm_time_tracking_member_projects_memberships_bulk_assign_bulk_assign_project_memberships } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_memberships_bulk_assign_bulk_assign_project_memberships";
import { prepare_random_erp_hrm_time_tracking_project } from "../../../prepare/prepare_random_erp_hrm_time_tracking_project";
import { prepare_random_erp_hrm_time_tracking_project_membership } from "../../../prepare/prepare_random_erp_hrm_time_tracking_project_membership";

export async function test_api_project_membership_bulk_assign_multiple_employees_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: create a project, then bulk-assign (via endpoint) two different employees
  // and validate each membership is active and scoped to the same project.
  // 1) Authenticate as a new member to establish organization context
  const memberJoinInput: IErpHrmTimeTrackingMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password!1234",
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
    organizationLogoUrl: null,
    ip: null,
  };
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: memberJoinInput,
  });
  typia.assert(authorized);
  // 2) Create a project in the caller's selected organization
  const project: IErpHrmTimeTrackingProject =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      memberConnection,
      {
        body: {
          name: `proj-${RandomGenerator.alphabets(8)}`,
          color: "#3b82f6",
          status: typia.random<string>(),
        },
      },
    );
  typia.assert(project);
  const projectId = project.id;
  // 3) Assign two employees with distinct roles
  const employeeId1 = typia.random<string & tags.Format<"uuid">>();
  const employeeId2 = typia.random<string & tags.Format<"uuid">>();
  const membershipRole1 = typia.random<string>();
  const membershipRole2 = typia.random<string>();
  const membership1: IErpHrmTimeTrackingProjectMembership =
    await generate_random_erp_hrm_time_tracking_member_projects_memberships_bulk_assign_bulk_assign_project_memberships(
      memberConnection,
      {
        params: { projectId },
        body: {
          employee_id: employeeId1,
          membership_role: membershipRole1,
        },
      },
    );
  typia.assert(membership1);
  const membership2: IErpHrmTimeTrackingProjectMembership =
    await generate_random_erp_hrm_time_tracking_member_projects_memberships_bulk_assign_bulk_assign_project_memberships(
      memberConnection,
      {
        params: { projectId },
        body: {
          employee_id: employeeId2,
          membership_role: membershipRole2,
        },
      },
    );
  typia.assert(membership2);
  // 4) Validate memberships
  TestValidator.equals(
    "project_id matches #1",
    membership1.project_id,
    projectId,
  );
  TestValidator.equals(
    "employee_id matches #1",
    membership1.employee_id,
    employeeId1,
  );
  TestValidator.equals(
    "membership_role matches #1",
    membership1.membership_role,
    membershipRole1,
  );
  TestValidator.equals("deleted_at is null #1", membership1.deleted_at, null);
  TestValidator.equals(
    "project_id matches #2",
    membership2.project_id,
    projectId,
  );
  TestValidator.equals(
    "employee_id matches #2",
    membership2.employee_id,
    employeeId2,
  );
  TestValidator.equals(
    "membership_role matches #2",
    membership2.membership_role,
    membershipRole2,
  );
  TestValidator.equals("deleted_at is null #2", membership2.deleted_at, null);
  // 5) Ensure separate memberships were created/updated and did not overwrite each other
  TestValidator.notEquals(
    "membership ids differ",
    membership1.id,
    membership2.id,
  );
}
