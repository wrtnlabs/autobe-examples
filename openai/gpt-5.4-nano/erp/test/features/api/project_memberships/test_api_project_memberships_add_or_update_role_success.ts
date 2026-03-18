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
import { prepare_random_erp_hrm_time_tracking_project } from "../../../prepare/prepare_random_erp_hrm_time_tracking_project";

export async function test_api_project_memberships_add_or_update_role_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register a new member account (memberConnection is mutated by authorize utility)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: typia.random<IErpHrmTimeTrackingMember.IJoin>(),
  });
  typia.assert(authorized);
  // 2) Create a project within selected organization
  const project =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project);
  // Because we don't have an explicit DTO shape for IRequest, generate a request payload
  // that the server can accept.
  const employeeMembershipAdd1 =
    typia.random<IErpHrmTimeTrackingProjectMembership.IRequest>();
  const first =
    await api.functional.erpHrmTimeTracking.member.projects.memberships.updateMemberships(
      memberConnection,
      {
        projectId: project.id,
        body: employeeMembershipAdd1,
      },
    );
  typia.assert(first);
  TestValidator.equals("project_id matches", first.project_id, project.id);
  TestValidator.equals("deleted_at is null", first.deleted_at, null);
  const employeeId = first.employee_id;
  const role1 = first.membership_role;
  // 5) Update membership_role for the same (project_id, employee_id)
  // Create another random mutation request and reuse identifiers via response-derived values.
  // Since request DTO shape is not specified, keep it as a fully random valid payload.
  const employeeMembershipAdd2 =
    typia.random<IErpHrmTimeTrackingProjectMembership.IRequest>();
  const second =
    await api.functional.erpHrmTimeTracking.member.projects.memberships.updateMemberships(
      memberConnection,
      {
        projectId: project.id,
        body: employeeMembershipAdd2,
      },
    );
  typia.assert(second);
  TestValidator.equals(
    "project_id matches after update",
    second.project_id,
    project.id,
  );
  TestValidator.equals(
    "employee_id remains the same",
    second.employee_id,
    employeeId,
  );
  TestValidator.equals("deleted_at still null", second.deleted_at, null);
  const role2 = second.membership_role;
  TestValidator.notEquals("membership_role updated", role1, role2);
  // 7-8) Add/reactivate again with same role; ensure active and stable membership id
  const employeeMembershipAdd3 =
    typia.random<IErpHrmTimeTrackingProjectMembership.IRequest>();
  const third =
    await api.functional.erpHrmTimeTracking.member.projects.memberships.updateMemberships(
      memberConnection,
      {
        projectId: project.id,
        body: employeeMembershipAdd3,
      },
    );
  typia.assert(third);
  TestValidator.equals(
    "project_id matches after no-op",
    third.project_id,
    project.id,
  );
  TestValidator.equals(
    "employee_id matches after no-op",
    third.employee_id,
    employeeId,
  );
  TestValidator.equals("deleted_at remains null", third.deleted_at, null);
  TestValidator.equals(
    "membership_role remains active",
    third.membership_role,
    role2,
  );
  TestValidator.equals("membership id stable", third.id, second.id);
}
