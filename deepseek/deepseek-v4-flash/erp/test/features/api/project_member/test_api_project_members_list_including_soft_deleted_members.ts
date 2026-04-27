import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingProjectMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { generate_random_hrm_time_tracking_member_projects_members_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_members_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_member } from "../../../prepare/prepare_random_hrm_time_tracking_project_member";

export async function test_api_project_members_list_including_soft_deleted_members(
  connection: api.IConnection,
): Promise<void> {
  // ── Setup: Register Member, create Org, create Project ──
  const password = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      password,
    },
  });
  typia.assert(member);
  // Create organization → Member becomes owner employee
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Re-login to get fresh IAuthorized with employee records populated
  const memberRelogged = await authorize_member_login(memberConnection, {
    body: {
      email: member.email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberRelogged);
  // Get the employee ID (the owner of the org)
  const employeeAId: string = memberRelogged.employees[0].id;
  // Create project within the organization
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project);
  // Add Employee A as a project member with role 'member'
  const memberAProjectMembership =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          employee_id: employeeAId,
          role: "member",
        } satisfies IHrmTimeTrackingProjectMember.ICreate,
      },
    );
  typia.assert(memberAProjectMembership);
  // ── Step 1: List with includeDeleted BEFORE soft-delete ──
  // Both should return 1 member since none have been soft-deleted yet
  const beforeWithDeleted =
    await api.functional.hrmTimeTracking.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          includeDeleted: true,
        } satisfies IHrmTimeTrackingProjectMember.IRequest,
      },
    );
  typia.assert(beforeWithDeleted);
  const beforeWithoutDeleted =
    await api.functional.hrmTimeTracking.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {} satisfies IHrmTimeTrackingProjectMember.IRequest,
      },
    );
  typia.assert(beforeWithoutDeleted);
  // Validate: before soft-delete, both lists contain the same 1 member
  TestValidator.equals(
    "before delete: records match with and without includeDeleted",
    beforeWithDeleted.pagination.records,
    beforeWithoutDeleted.pagination.records,
  );
  TestValidator.equals(
    "before delete: exactly 1 member",
    beforeWithoutDeleted.pagination.records,
    1 satisfies number,
  );
  // ── Step 2: Soft-delete Employee A's membership ──
  await api.functional.hrmTimeTracking.member.projects.members.erase(
    memberConnection,
    {
      projectId: project.id,
      memberId: memberAProjectMembership.id,
    },
  );
  // ── Step 3: List AFTER soft-delete ──
  const afterWithDeleted =
    await api.functional.hrmTimeTracking.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          includeDeleted: true,
        } satisfies IHrmTimeTrackingProjectMember.IRequest,
      },
    );
  typia.assert(afterWithDeleted);
  const afterWithoutDeleted =
    await api.functional.hrmTimeTracking.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {} satisfies IHrmTimeTrackingProjectMember.IRequest,
      },
    );
  typia.assert(afterWithoutDeleted);
  // Validate: with includeDeleted → 1 record (the soft-deleted member)
  TestValidator.equals(
    "after delete: includeDeleted returns 1 record",
    afterWithDeleted.pagination.records,
    1 satisfies number,
  );
  // Validate: without includeDeleted → 0 records (soft-deleted excluded)
  TestValidator.equals(
    "after delete: without includeDeleted returns 0 records",
    afterWithoutDeleted.pagination.records,
    0 satisfies number,
  );
  // Validate: the soft-deleted member data is preserved
  const archivedMemberIds = new Set<string>(
    afterWithDeleted.data.map((m) => m.id),
  );
  TestValidator.predicate(
    "soft-deleted member appears with includeDeleted",
    archivedMemberIds.has(memberAProjectMembership.id),
  );
  // Validate: pagination reflects the difference (1 vs 0)
  TestValidator.equals(
    "pagination difference is 1",
    afterWithDeleted.pagination.records -
      afterWithoutDeleted.pagination.records,
    1 satisfies number,
  );
}
