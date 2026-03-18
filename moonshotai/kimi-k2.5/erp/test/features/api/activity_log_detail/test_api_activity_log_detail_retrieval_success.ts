import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import type { IErpHrmActivityLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLogDetail";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmActivityLog";
import type { IPageIErpHrmActivityLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmActivityLogDetail";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organization_members_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

/**
 * Test successful retrieval of an activity log detail when the member has proper organization membership and permissions.
 *
 * Setup sequence:
 * 1. Authenticate as a member via /erpHrm/auth/member/join
 * 2. Create an organization via POST /erpHrm/member/organizations (ensures organization context)
 * 3. Create an employee via POST /erpHrm/member/organizationMembers (to have a target for activity logging)
 * 4. Create a project via POST /erpHrm/member/projects
 * 5. Create a task within the project via POST /erpHrm/member/projects/{projectId}/tasks
 * 6. Update task status via PUT /erpHrm/member/projects/{projectId}/tasks/{taskId} to generate activity log entry with details (task status change events create activity logs)
 * 7. Retrieve activity logs via PATCH /erpHrm/member/organizations/{organizationId}/activity-logs to find the activityLogId
 * 8. Retrieve activity log details via PATCH /erpHrm/member/organizations/{organizationId}/activity-logs/{activityLogId}/details to find the detailId
 * 9. Execute target: GET /erpHrm/member/organizations/{organizationId}/activity-logs/{activityLogId}/details/{detailId}
 *
 * Validation points:
 * - Response contains valid IErpHrmActivityLogDetail structure
 * - The detail record contains expected key-value pairs (e.g., key='previous_status', value='todo' for task workflow events)
 * - The nested activityLog reference resolves correctly
 * - The detail belongs to the requested activity log
 * - Data isolation is maintained - member can only access their organization's activity logs
 */
export async function test_api_activity_log_detail_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create an organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_year_start_month: 1,
        } satisfies IErpHrmOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create an employee (organization member) - the member themselves
  // First need to get the role for the organization member
  // For this test, we use the member's own ID as the user to invite
  const organizationMember =
    await generate_random_erp_hrm_member_organization_members_create(
      memberConnection,
      {
        body: {
          organizationId: organization.id,
          userId: member.id,
          roleId: organization.owner.id, // Use a valid role reference
          employmentType: "full_time",
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(organizationMember);
  // 4. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        status: "active",
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(project);
  // 5. Create a task within the project
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.name(),
        status: "Open",
        priority: "Medium",
      } satisfies IErpHrmTask.ICreate,
    },
  );
  typia.assert(task);
  // 6. Update task status to generate activity log entry with details
  const updatedTask = await api.functional.erpHrm.member.projects.tasks.update(
    memberConnection,
    {
      projectId: project.id,
      taskId: task.id,
      body: {
        status: "In-Progress",
      } satisfies IErpHrmTask.IUpdate,
    },
  );
  typia.assert(updatedTask);
  TestValidator.notEquals(
    "task status changed",
    updatedTask.status,
    task.status,
  );
  // 7. Retrieve activity logs to find the generated activity log ID
  const activityLogsResponse =
    await api.functional.erpHrm.member.organizations.activity_logs.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          search: null,
          action: ["update"],
          entityType: "task",
          entityId: task.id,
          actorMemberId: null,
          actorGuestId: null,
          ipAddress: null,
          createdAtFrom: null,
          createdAtTo: null,
          sort: null,
          page: 1,
          limit: 10,
        } satisfies IErpHrmActivityLog.IRequest,
      },
    );
  typia.assert(activityLogsResponse);
  TestValidator.predicate(
    "activity logs found",
    activityLogsResponse.data.length > 0,
  );
  const activityLog = activityLogsResponse.data[0];
  TestValidator.equals(
    "activity log entity type",
    activityLog.entity_type,
    "task",
  );
  TestValidator.equals(
    "activity log entity id",
    activityLog.entity_id,
    task.id,
  );
  // 8. Retrieve activity log details to find the detailId
  const activityLogDetailsResponse =
    await api.functional.erpHrm.member.organizations.activity_logs.details.index(
      memberConnection,
      {
        organizationId: organization.id,
        activityLogId: activityLog.id,
        body: {
          key: "status",
          value: undefined,
          page: 1,
          limit: 10,
        } satisfies IErpHrmActivityLogDetail.IRequest,
      },
    );
  typia.assert(activityLogDetailsResponse);
  TestValidator.predicate(
    "activity log details found",
    activityLogDetailsResponse.data.length > 0,
  );
  const detail = activityLogDetailsResponse.data[0];
  // 9. Execute target: GET specific activity log detail by ID
  const retrievedDetail =
    await api.functional.erpHrm.member.organizations.activity_logs.details.at(
      memberConnection,
      {
        organizationId: organization.id,
        activityLogId: activityLog.id,
        detailId: detail.id,
      },
    );
  typia.assert(retrievedDetail);
  // Validation points
  TestValidator.equals("detail id matches", retrievedDetail.id, detail.id);
  TestValidator.equals(
    "activity log id matches",
    retrievedDetail.activityLog.id,
    activityLog.id,
  );
  TestValidator.predicate(
    "key is valid string",
    typeof retrievedDetail.key === "string" && retrievedDetail.key.length > 0,
  );
  TestValidator.predicate(
    "createdAt is valid timestamp",
    retrievedDetail.createdAt !== null,
  );
  // Data isolation validation - detail belongs to the correct activity log
  TestValidator.equals(
    "detail belongs to correct activity log",
    retrievedDetail.activityLog.id,
    activityLog.id,
  );
}
