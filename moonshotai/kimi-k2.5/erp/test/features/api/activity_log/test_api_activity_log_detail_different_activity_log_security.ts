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
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

export async function test_api_activity_log_detail_different_activity_log_security(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Create two projects to generate two separate activity logs
  const project1 = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project1);
  const project2 = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project2);
  // Retrieve activity logs to get two different activityLogIds
  const activityLogsResponse =
    await api.functional.erpHrm.member.organizations.activity_logs.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          search: null,
          action: null,
          entityType: null,
          entityId: null,
          actorMemberId: null,
          actorGuestId: null,
          ipAddress: null,
          createdAtFrom: null,
          createdAtTo: null,
          sort: null,
          page: 1,
          limit: 100,
        } satisfies IErpHrmActivityLog.IRequest,
      },
    );
  typia.assert(activityLogsResponse);
  // Verify we have at least 2 activity logs
  TestValidator.predicate(
    "at least 2 activity logs exist",
    activityLogsResponse.data.length >= 2,
  );
  const firstActivityLog = activityLogsResponse.data[0];
  const secondActivityLog = activityLogsResponse.data[1];
  // Create a task in the first project to enable detail generation
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project1.id },
      body: {},
    },
  );
  typia.assert(task);
  // Update task status to generate activity log details
  await api.functional.erpHrm.member.projects.tasks.update(memberConnection, {
    projectId: project1.id,
    taskId: task.id,
    body: {
      status: "In-Progress",
    } satisfies IErpHrmTask.IUpdate,
  });
  // Retrieve details from the first activity log to get a valid detailId
  const detailsResponse =
    await api.functional.erpHrm.member.organizations.activity_logs.details.index(
      memberConnection,
      {
        organizationId: organization.id,
        activityLogId: firstActivityLog.id,
        body: {} satisfies IErpHrmActivityLogDetail.IRequest,
      },
    );
  typia.assert(detailsResponse);
  // Verify we have at least one detail
  TestValidator.predicate(
    "at least one detail exists in first activity log",
    detailsResponse.data.length >= 1,
  );
  const detailId = detailsResponse.data[0].id;
  // Execute target: Try to access detail using wrong activity log ID
  // Should return 404 Not Found (not 403) as per security specification
  await TestValidator.httpError(
    "accessing detail with mismatched activity log id returns 404",
    404,
    async () => {
      await api.functional.erpHrm.member.organizations.activity_logs.details.at(
        memberConnection,
        {
          organizationId: organization.id,
          activityLogId: secondActivityLog.id,
          detailId: detailId,
        },
      );
    },
  );
}
