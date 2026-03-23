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

export async function test_api_project_creation_by_member_with_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare member account with join (no utility function available)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = typia.random<IHrmTrackerMember.IJoin>();
  const member = await api.functional.hrmTracker.auth.member.join(
    memberConnection,
    {
      body: memberData,
    },
  );
  typia.assert(member);
  // 2. Prepare project creation data with all possible fields
  const now = new Date();
  const projectData: IHrmTrackerProject.ICreate = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    color: "#FF5733",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    budget_hours: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<1000>
    >(),
    start_date: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies IHrmTrackerProject.ICreate;
  // 3. Create project as authenticated member
  const project = await api.functional.hrmTracker.member.projects.create(
    memberConnection,
    {
      body: projectData,
    },
  );
  typia.assert(project);
  // 4. Validate project structure
  TestValidator.equals("name matches", project.name, projectData.name);
  TestValidator.equals("color matches", project.color, projectData.color);
  TestValidator.equals(
    "description matches",
    project.description,
    projectData.description,
  );
  TestValidator.equals(
    "budget_hours matches",
    project.budget_hours,
    projectData.budget_hours,
  );
  TestValidator.equals(
    "start_date matches",
    project.start_date,
    projectData.start_date,
  );
  TestValidator.equals(
    "end_date matches",
    project.end_date,
    projectData.end_date,
  );
  TestValidator.equals("status is active", project.status, "active");
  TestValidator.predicate(
    "has valid organization summary",
    project.organization !== null,
  );
  TestValidator.predicate(
    "organization has valid ID",
    /^[0-9a-f-]{36}$/i.test(project.organization.id),
  );
  TestValidator.predicate(
    "organization has valid name",
    typeof project.organization.name === "string",
  );
  TestValidator.predicate("created_at exists", project.created_at !== null);
  TestValidator.predicate("updated_at exists", project.updated_at !== null);
  TestValidator.predicate(
    "has UUID format",
    /^[0-9a-f-]{36}$/i.test(project.id),
  );
}
