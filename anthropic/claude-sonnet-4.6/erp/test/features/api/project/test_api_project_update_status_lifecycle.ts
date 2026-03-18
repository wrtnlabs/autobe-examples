import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
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

export async function test_api_project_update_status_lifecycle(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create an organization (authenticated member becomes owner)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a project (starts with status 'active' automatically)
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // Store initial values for comparison
  const initialId = project.id;
  const initialOrganizationId = project.organization_id;
  const initialName = project.name;
  const initialColor = project.color;
  const initialUpdatedAt = project.updated_at;
  // Verify initial status is 'active'
  TestValidator.equals("initial status is active", project.status, "active");
  // 4. First transition: active → archived
  const archivedProject = await api.functional.erpHrm.member.projects.update(
    memberConnection,
    {
      projectId: initialId,
      body: {
        name: initialName,
        color: initialColor,
        status: "archived",
      } satisfies IErpHrmProject.IUpdate,
    },
  );
  typia.assert(archivedProject);
  // Assert first transition results
  TestValidator.equals(
    "status is archived after first transition",
    archivedProject.status,
    "archived",
  );
  TestValidator.equals(
    "id unchanged after first transition",
    archivedProject.id,
    initialId,
  );
  TestValidator.equals(
    "organization_id unchanged after first transition",
    archivedProject.organization_id,
    initialOrganizationId,
  );
  TestValidator.equals(
    "name unchanged after first transition",
    archivedProject.name,
    initialName,
  );
  TestValidator.equals(
    "color unchanged after first transition",
    archivedProject.color,
    initialColor,
  );
  TestValidator.notEquals(
    "updated_at refreshed after first transition",
    archivedProject.updated_at,
    initialUpdatedAt,
  );
  // 5. Second transition: archived → completed
  const completedProject = await api.functional.erpHrm.member.projects.update(
    memberConnection,
    {
      projectId: initialId,
      body: {
        name: initialName,
        color: initialColor,
        status: "completed",
      } satisfies IErpHrmProject.IUpdate,
    },
  );
  typia.assert(completedProject);
  // Assert second transition results
  TestValidator.equals(
    "status is completed after second transition",
    completedProject.status,
    "completed",
  );
  TestValidator.equals(
    "id unchanged after second transition",
    completedProject.id,
    initialId,
  );
  TestValidator.equals(
    "organization_id unchanged after second transition",
    completedProject.organization_id,
    initialOrganizationId,
  );
  TestValidator.equals(
    "name unchanged after second transition",
    completedProject.name,
    initialName,
  );
  TestValidator.equals(
    "color unchanged after second transition",
    completedProject.color,
    initialColor,
  );
}
