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

export async function test_api_project_creation_with_full_attributes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create an organization (member becomes owner with project:manage permission)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a project with all optional fields populated
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Beta Project",
        color: "#E74C3C",
        description: "Full-featured project for Q2 delivery",
        budget_hours: 240.5,
        started_at: "2026-04-01T00:00:00.000Z",
        ended_at: "2026-06-30T23:59:59.000Z",
      },
    },
  );
  typia.assert(project);
  // 4. Validate all fields match the input
  TestValidator.equals("project name", project.name, "Beta Project");
  TestValidator.equals("project color", project.color, "#E74C3C");
  TestValidator.equals(
    "project description",
    project.description,
    "Full-featured project for Q2 delivery",
  );
  TestValidator.equals("project budget_hours", project.budget_hours, 240.5);
  TestValidator.equals(
    "project started_at",
    project.started_at,
    "2026-04-01T00:00:00.000Z",
  );
  TestValidator.equals(
    "project ended_at",
    project.ended_at,
    "2026-06-30T23:59:59.000Z",
  );
  TestValidator.equals("project status", project.status, "active");
  TestValidator.equals(
    "project organization_id",
    project.organization_id,
    organization.id,
  );
  // 5. Edge case: ended_at before started_at should be rejected
  await TestValidator.error(
    "ended_at before started_at should be rejected",
    async () => {
      await generate_random_erp_hrm_member_projects_create(memberConnection, {
        body: {
          name: "Invalid Date Project",
          color: "#000000",
          started_at: "2026-06-01T00:00:00.000Z",
          ended_at: "2026-04-01T00:00:00.000Z",
        },
      });
    },
  );
}
