import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

export async function test_api_project_update_budget_and_timeline(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member with project management permissions
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create project with initial budget and timeline
  const initialBudgetHours = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<1000>
  >();
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days later
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        color_code: "#3498db",
        status: "active",
        budget_hours: initialBudgetHours,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // Validate initial project state
  TestValidator.equals(
    "initial budget hours",
    project.budget_hours,
    initialBudgetHours,
  );
  TestValidator.equals("project name preserved", project.name, project.name);
  TestValidator.equals("status is active", project.status, "active");
  // 3. Test updating budget_hours to a new value
  const updatedBudgetHours = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<500> & tags.Maximum<2000>
  >();
  const updatedProject1 =
    await api.functional.hrmPlatform.member.projects.update(memberConnection, {
      projectId: project.id,
      body: {
        budget_hours: updatedBudgetHours,
      } satisfies IHrmPlatformProject.IUpdate,
    });
  typia.assert(updatedProject1);
  TestValidator.equals(
    "budget hours updated",
    updatedProject1.budget_hours,
    updatedBudgetHours,
  );
  TestValidator.equals(
    "name unchanged after budget update",
    updatedProject1.name,
    project.name,
  );
  TestValidator.equals(
    "description unchanged",
    updatedProject1.description,
    project.description,
  );
  TestValidator.equals(
    "color_code unchanged",
    updatedProject1.color_code,
    project.color_code,
  );
  TestValidator.equals(
    "start_date unchanged",
    updatedProject1.start_date,
    project.start_date,
  );
  TestValidator.equals(
    "end_date unchanged",
    updatedProject1.end_date,
    project.end_date,
  );
  // 4. Test setting budget_hours to null to remove budget tracking
  const updatedProject2 =
    await api.functional.hrmPlatform.member.projects.update(memberConnection, {
      projectId: project.id,
      body: {
        budget_hours: null,
      } satisfies IHrmPlatformProject.IUpdate,
    });
  typia.assert(updatedProject2);
  TestValidator.equals(
    "budget hours set to null",
    updatedProject2.budget_hours,
    null,
  );
  TestValidator.equals(
    "name unchanged after null budget",
    updatedProject2.name,
    project.name,
  );
  // 5. Test updating start_date independently
  const newStartDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days later
  const updatedProject3 =
    await api.functional.hrmPlatform.member.projects.update(memberConnection, {
      projectId: project.id,
      body: {
        start_date: newStartDate.toISOString(),
      } satisfies IHrmPlatformProject.IUpdate,
    });
  typia.assert(updatedProject3);
  TestValidator.equals(
    "start_date updated",
    updatedProject3.start_date,
    newStartDate.toISOString(),
  );
  TestValidator.equals(
    "end_date preserved after start_date update",
    updatedProject3.end_date,
    project.end_date,
  );
  TestValidator.equals(
    "budget_hours remains null",
    updatedProject3.budget_hours,
    null,
  );
  // 6. Test updating end_date independently
  const newEndDate = new Date(
    newStartDate.getTime() + 45 * 24 * 60 * 60 * 1000,
  ); // 45 days after new start
  const updatedProject4 =
    await api.functional.hrmPlatform.member.projects.update(memberConnection, {
      projectId: project.id,
      body: {
        end_date: newEndDate.toISOString(),
      } satisfies IHrmPlatformProject.IUpdate,
    });
  typia.assert(updatedProject4);
  TestValidator.equals(
    "end_date updated",
    updatedProject4.end_date,
    newEndDate.toISOString(),
  );
  TestValidator.equals(
    "start_date preserved after end_date update",
    updatedProject4.start_date,
    newStartDate.toISOString(),
  );
  // 7. Test setting timeline dates to null for open-ended projects
  const updatedProject5 =
    await api.functional.hrmPlatform.member.projects.update(memberConnection, {
      projectId: project.id,
      body: {
        start_date: null,
        end_date: null,
      } satisfies IHrmPlatformProject.IUpdate,
    });
  typia.assert(updatedProject5);
  TestValidator.equals(
    "start_date set to null",
    updatedProject5.start_date,
    null,
  );
  TestValidator.equals("end_date set to null", updatedProject5.end_date, null);
  TestValidator.equals(
    "name preserved after null timeline",
    updatedProject5.name,
    project.name,
  );
  TestValidator.equals(
    "status preserved after null timeline",
    updatedProject5.status,
    "active",
  );
  // 8. Test restoring budget and timeline
  const restoredBudget = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<200> & tags.Maximum<500>
  >();
  const restoredStartDate = new Date();
  const restoredEndDate = new Date(
    restoredStartDate.getTime() + 60 * 24 * 60 * 60 * 1000,
  );
  const updatedProject6 =
    await api.functional.hrmPlatform.member.projects.update(memberConnection, {
      projectId: project.id,
      body: {
        budget_hours: restoredBudget,
        start_date: restoredStartDate.toISOString(),
        end_date: restoredEndDate.toISOString(),
      } satisfies IHrmPlatformProject.IUpdate,
    });
  typia.assert(updatedProject6);
  TestValidator.equals(
    "budget restored",
    updatedProject6.budget_hours,
    restoredBudget,
  );
  TestValidator.equals(
    "start_date restored",
    updatedProject6.start_date,
    restoredStartDate.toISOString(),
  );
  TestValidator.equals(
    "end_date restored",
    updatedProject6.end_date,
    restoredEndDate.toISOString(),
  );
  TestValidator.equals(
    "all attributes preserved through multiple updates",
    updatedProject6.name,
    project.name,
  );
}
