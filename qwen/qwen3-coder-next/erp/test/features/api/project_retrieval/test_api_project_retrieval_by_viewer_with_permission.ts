import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import type { IHrmTrackerProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProjectMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_organizations_create } from "../../../generate/generate_random_hrm_tracker_member_organizations_create";
import { generate_random_hrm_tracker_member_projects_create } from "../../../generate/generate_random_hrm_tracker_member_projects_create";
import { generate_random_hrm_tracker_member_projects_project_members_create } from "../../../generate/generate_random_hrm_tracker_member_projects_project_members_create";
import { prepare_random_hrm_tracker_organization } from "../../../prepare/prepare_random_hrm_tracker_organization";
import { prepare_random_hrm_tracker_project } from "../../../prepare/prepare_random_hrm_tracker_project";
import { prepare_random_hrm_tracker_project_member } from "../../../prepare/prepare_random_hrm_tracker_project_member";

/**
 * Test project retrieval by viewer with project view permission but not assigned to project.
 * 1. Create member account
 * 2. Create organization
 * 3. Create project in organization
 * 4. Assign member to project with project:manage permission
 * 5. Retrieve project as viewer and validate fields
 */
export async function test_api_project_retrieval_by_viewer_with_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 2. Create organization
  const org = await generate_random_hrm_tracker_member_organizations_create(
    memberConnection,
    {},
  );
  typia.assert(org);
  // 3. Create project in the organization
  const project = await generate_random_hrm_tracker_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        color: "#FF5733",
        description: RandomGenerator.paragraph({ sentences: 2 }),
        budget_hours: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<0>
        >(),
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000).toISOString(),
      },
    },
  );
  typia.assert(project);
  // 4. Assign member to project with project:manage permission
  // Note: Using member's own connection as viewer since they created the project
  const projectMember =
    await generate_random_hrm_tracker_member_projects_project_members_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          role: "member",
        },
      },
    );
  typia.assert(projectMember);
  // 5. Retrieve project as viewer and validate fields
  // Use memberConnection which is already authenticated and has project access
  const retrievedProject = await api.functional.hrmTracker.member.projects.at(
    memberConnection,
    {
      projectId: project.id,
    },
  );
  typia.assert(retrievedProject);
  // 6. Validate project fields
  TestValidator.equals("project ID matches", retrievedProject.id, project.id);
  TestValidator.equals(
    "project name matches",
    retrievedProject.name,
    project.name,
  );
  TestValidator.equals(
    "project color matches",
    retrievedProject.color,
    project.color,
  );
  TestValidator.equals(
    "organization ID matches",
    retrievedProject.organization.id,
    org.id,
  );
  TestValidator.equals(
    "organization name matches",
    retrievedProject.organization.name,
    org.name,
  );
  TestValidator.predicate(
    "created_at is valid",
    retrievedProject.created_at !== undefined,
  );
}
