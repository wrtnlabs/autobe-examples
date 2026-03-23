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

export async function test_api_project_status_archived_by_project_manager(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = typia.random<IHrmTrackerMember.IJoin>();
  const member = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(member);
  // Step 2: Create a project with active status (organization context is required)
  const projectData = typia.random<IHrmTrackerProject.ICreate>();
  const createdProject = await api.functional.hrmTracker.member.projects.create(
    memberConnection,
    {
      body: projectData,
    },
  );
  typia.assert(createdProject);
  TestValidator.equals(
    "project status is active",
    createdProject.status,
    "active",
  );
  typia.assert(createdProject.organization);
  // Step 3: Archive the project (active → archived transition)
  const archivedProject =
    await api.functional.hrmTracker.member.projects.status_change.statusChange(
      memberConnection,
      {
        projectId: createdProject.id,
      },
    );
  typia.assert(archivedProject);
  // Step 4: Verify the project is archived
  TestValidator.equals(
    "project status is archived",
    archivedProject.status,
    "archived",
  );
  TestValidator.equals(
    "project ID matches",
    archivedProject.id,
    createdProject.id,
  );
  TestValidator.equals(
    "organization preserved",
    archivedProject.organization.id,
    createdProject.organization.id,
  );
}
