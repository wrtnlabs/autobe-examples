import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";

export async function test_api_project_update_details(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {
        body: {
          name: `project-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          colorCode: "#a1b2c3",
          status: "active",
          budgetHours: 40,
          startDate: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
        } satisfies IHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(project);
  const beforeUpdatedAt = project.updatedAt;
  const beforeCreatedAt = project.createdAt;
  const updateBody = {
    name: `project-${RandomGenerator.alphabets(10)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    color_code: "#c3d4e5",
    status: "active",
    budget_hours: 80,
    start_date: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
  } satisfies IHrmTimeTrackingProject.IUpdate;
  const updated = await api.functional.hrmTimeTracking.member.projects.update(
    memberConnection,
    {
      projectId: project.id,
      body: updateBody,
    },
  );
  typia.assert(updated);
  TestValidator.equals("project id preserved", updated.id, project.id);
  TestValidator.equals(
    "organization preserved",
    updated.organization.id,
    project.organization.id,
  );
  TestValidator.equals("project name updated", updated.name, updateBody.name);
  TestValidator.equals(
    "project description updated",
    updated.description,
    updateBody.description,
  );
  TestValidator.equals(
    "project color updated",
    updated.colorCode,
    updateBody.color_code,
  );
  TestValidator.equals(
    "project status updated",
    updated.status,
    updateBody.status,
  );
  TestValidator.equals(
    "project budget updated",
    updated.budgetHours,
    updateBody.budget_hours,
  );
  TestValidator.equals(
    "project start date updated",
    updated.startDate,
    updateBody.start_date,
  );
  TestValidator.equals(
    "project end date updated",
    updated.endDate,
    updateBody.end_date,
  );
  TestValidator.equals(
    "createdAt preserved",
    updated.createdAt,
    beforeCreatedAt,
  );
  TestValidator.notEquals(
    "updatedAt changed",
    updated.updatedAt,
    beforeUpdatedAt,
  );
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthenticated update rejected", async () => {
    await api.functional.hrmTimeTracking.member.projects.update(
      unauthenticatedConnection,
      {
        projectId: project.id,
        body: {
          name: `blocked-${RandomGenerator.alphabets(6)}`,
        } satisfies IHrmTimeTrackingProject.IUpdate,
      },
    );
  });
}
