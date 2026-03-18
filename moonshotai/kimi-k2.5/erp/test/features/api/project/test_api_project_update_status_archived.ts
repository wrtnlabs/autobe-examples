import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
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
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";

/**
 * Test the project status transition from active to archived.
 * A member with project management permission creates an organization,
 * creates an active project, then updates the project status to 'archived'.
 * Verify that the status change is successfully persisted and that the
 * project is no longer available for new work. The response should show
 * status as 'archived' while maintaining all other project attributes.
 */
export async function test_api_project_update_status_archived(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create an organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Create an active project (status defaults to 'active')
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // Verify initial status is active
  TestValidator.equals("initial status is active", project.status, "active");
  // Step 4: Update project status to archived
  const updateBody = {
    status: "archived",
  } satisfies IErpHrmProject.IUpdate;
  const updatedProject = await api.functional.erpHrm.member.projects.update(
    memberConnection,
    {
      projectId: project.id,
      body: updateBody,
    },
  );
  typia.assert(updatedProject);
  // Step 5: Validate the status has been updated to archived
  TestValidator.equals("status is archived", updatedProject.status, "archived");
  // Step 6: Validate other project attributes are preserved
  TestValidator.equals("id preserved", updatedProject.id, project.id);
  TestValidator.equals("name preserved", updatedProject.name, project.name);
  TestValidator.equals(
    "organization preserved",
    updatedProject.organization.id,
    project.organization.id,
  );
}
