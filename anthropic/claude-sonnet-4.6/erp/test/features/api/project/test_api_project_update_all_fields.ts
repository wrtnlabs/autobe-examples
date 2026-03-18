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

export async function test_api_project_update_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and create a member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create an organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a new project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 4. First update — all mutable fields populated
  const startedAt = new Date("2025-01-01T09:00:00.000Z").toISOString();
  const endedAt = new Date("2025-06-30T18:00:00.000Z").toISOString();
  const updateBody = {
    name: "Updated Project Alpha",
    color: "#3A86FF",
    status: "completed",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    budget_hours: 120.5,
    started_at: startedAt,
    ended_at: endedAt,
  } satisfies IErpHrmProject.IUpdate;
  const updated = await api.functional.erpHrm.member.projects.update(
    memberConnection,
    {
      projectId: project.id,
      body: updateBody,
    },
  );
  typia.assert(updated);
  // Assertions: fields match submitted values
  TestValidator.equals("name updated", updated.name, updateBody.name);
  TestValidator.equals("color updated", updated.color, updateBody.color);
  TestValidator.equals("status updated", updated.status, updateBody.status);
  TestValidator.equals(
    "description updated",
    updated.description,
    updateBody.description,
  );
  TestValidator.equals(
    "budget_hours updated",
    updated.budget_hours,
    updateBody.budget_hours,
  );
  TestValidator.equals(
    "started_at updated",
    updated.started_at,
    updateBody.started_at,
  );
  TestValidator.equals(
    "ended_at updated",
    updated.ended_at,
    updateBody.ended_at,
  );
  // Immutable fields remain unchanged
  TestValidator.equals("id unchanged", updated.id, project.id);
  TestValidator.equals(
    "organization_id unchanged",
    updated.organization_id,
    project.organization_id,
  );
  // updated_at is later than created_at
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updated.updated_at) >= new Date(updated.created_at),
  );
  // 5. Second update — clear all optional fields
  const clearBody = {
    name: "Updated Project Alpha",
    color: "#3A86FF",
    status: "completed",
    description: null,
    budget_hours: null,
    started_at: null,
    ended_at: null,
  } satisfies IErpHrmProject.IUpdate;
  const cleared = await api.functional.erpHrm.member.projects.update(
    memberConnection,
    {
      projectId: project.id,
      body: clearBody,
    },
  );
  typia.assert(cleared);
  // Assertions: optional fields are now null
  TestValidator.equals("description cleared", cleared.description, null);
  TestValidator.equals("budget_hours cleared", cleared.budget_hours, null);
  TestValidator.equals("started_at cleared", cleared.started_at, null);
  TestValidator.equals("ended_at cleared", cleared.ended_at, null);
  // Required fields still match
  TestValidator.equals(
    "name still correct after clear",
    cleared.name,
    clearBody.name,
  );
  TestValidator.equals(
    "color still correct after clear",
    cleared.color,
    clearBody.color,
  );
  TestValidator.equals(
    "status still correct after clear",
    cleared.status,
    clearBody.status,
  );
  TestValidator.equals(
    "id still unchanged after clear",
    cleared.id,
    project.id,
  );
}
