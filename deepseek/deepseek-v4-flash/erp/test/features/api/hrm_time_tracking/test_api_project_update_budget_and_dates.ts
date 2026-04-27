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
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";

export async function test_api_project_update_budget_and_dates(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create an organization (the member becomes owner with project:manage permission)
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a project without budget or dates
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {
        body: {
          name: "Budget Project",
          color_code: "#9B59B6",
          budget_hours: undefined,
          started_at: undefined,
          ended_at: undefined,
        },
      },
    );
  typia.assert(project);
  TestValidator.equals(
    "initial budget_hours is null",
    project.budget_hours,
    null,
  );
  TestValidator.equals("initial started_at is null", project.started_at, null);
  TestValidator.equals("initial ended_at is null", project.ended_at, null);
  TestValidator.equals("initial status is active", project.status, "active");
  const originalUpdatedAt = project.updated_at;
  // 4. Update the project with budget and dates
  const startedAt = "2026-05-01T00:00:00Z";
  const endedAt = "2026-06-30T00:00:00Z";
  const updated = await api.functional.hrmTimeTracking.member.projects.update(
    memberConnection,
    {
      projectId: project.id,
      body: {
        budget_hours: 120,
        started_at: startedAt,
        ended_at: endedAt,
      } satisfies IHrmTimeTrackingProject.IUpdate,
    },
  );
  typia.assert(updated);
  // 5. Validate the updated project
  TestValidator.equals(
    "budget_hours updated to 120",
    updated.budget_hours,
    120,
  );
  TestValidator.equals("started_at updated", updated.started_at, startedAt);
  TestValidator.equals("ended_at updated", updated.ended_at, endedAt);
  TestValidator.equals("status remains active", updated.status, "active");
  TestValidator.notEquals(
    "updated_at changed",
    updated.updated_at,
    originalUpdatedAt,
  );
}
