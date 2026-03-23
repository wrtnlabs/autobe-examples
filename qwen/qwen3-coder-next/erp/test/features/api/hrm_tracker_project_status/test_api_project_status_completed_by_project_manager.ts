import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_projects_create } from "../../../generate/generate_random_hrm_tracker_member_projects_create";
import { prepare_random_hrm_tracker_project } from "../../../prepare/prepare_random_hrm_tracker_project";

export async function test_api_project_status_completed_by_project_manager(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  // 2. Create a project in 'active' status
  const project = await api.functional.hrmTracker.member.projects.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: RandomGenerator.alphabets(6),
        description: RandomGenerator.content({ paragraphs: 1 }),
        budget_hours: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<1000>
        >(),
        start_date: new Date().toISOString(),
      } satisfies IHrmTrackerProject.ICreate,
    },
  );
  typia.assert(project);
  TestValidator.equals("project status is active", project.status, "active");
  // 3. Complete the project
  const completedProject =
    await api.functional.hrmTracker.member.projects.status_change.statusChange(
      memberConnection,
      {
        projectId: project.id,
      },
    );
  typia.assert(completedProject);
  // 4. Verify response contains updated project with completed status
  TestValidator.equals(
    "project status is completed",
    completedProject.status,
    "completed",
  );
  TestValidator.equals("project ID matches", completedProject.id, project.id);
  TestValidator.equals(
    "project name matches",
    completedProject.name,
    project.name,
  );
  // 5. Verify organization summary is included
  TestValidator.equals(
    "organization ID matches",
    completedProject.hrm_tracker_organization_id,
    project.hrm_tracker_organization_id,
  );
  typia.assert(completedProject.organization);
  // 6. Test error case: attempt to complete already completed project (should fail)
  await TestValidator.error(
    "should fail to complete already completed project",
    async () => {
      await api.functional.hrmTracker.member.projects.status_change.statusChange(
        memberConnection,
        {
          projectId: project.id,
        },
      );
    },
  );
}
