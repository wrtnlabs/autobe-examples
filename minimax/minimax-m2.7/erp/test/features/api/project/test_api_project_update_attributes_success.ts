import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

export async function test_api_project_update_attributes_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin user with project:manage permission
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create initial project with specific attributes
  const initialProject = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: "Test Project",
        description: "Initial description",
        color: "#3498db",
        status: "active",
        budget_hours: 100,
        start_date: RandomGenerator.date(new Date(), 0).toISOString(),
        end_date: RandomGenerator.date(new Date(), 30 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies IErpHrmProjectMember.ICreate,
    },
  );
  typia.assert(initialProject);
  // Store original values for comparison
  const originalCreatedAt = initialProject.created_at;
  const originalOrganizationId = initialProject.organization.id;
  // 3. Update project with new attributes
  const updatedProject = await api.functional.erpHrm.admin.projects.update(
    adminConnection,
    {
      projectId: initialProject.id,
      body: {
        name: "Updated Project Name",
        description: "Updated description text",
        color: "#e74c3c",
        budget_hours: 200,
        start_date: RandomGenerator.date(new Date(), 7 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: RandomGenerator.date(new Date(), 60 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies IErpHrmProjectMember.IUpdate,
    },
  );
  typia.assert(updatedProject);
  // 4. Validate all fields are correctly updated
  TestValidator.equals(
    "project ID unchanged",
    updatedProject.id,
    initialProject.id,
  );
  TestValidator.equals(
    "name updated",
    updatedProject.name,
    "Updated Project Name",
  );
  TestValidator.equals(
    "description updated",
    updatedProject.description,
    "Updated description text",
  );
  TestValidator.equals("color updated", updatedProject.color, "#e74c3c");
  TestValidator.equals(
    "budget_hours updated",
    updatedProject.budget_hours,
    200,
  );
  // 5. Verify updated_at timestamp is automatically set (not null, not equal to created_at)
  TestValidator.predicate(
    "updated_at is not null",
    updatedProject.updated_at !== null,
  );
  TestValidator.notEquals(
    "updated_at differs from created_at",
    updatedProject.updated_at,
    originalCreatedAt,
  );
  // 6. Verify organization relationship remains unchanged
  TestValidator.equals(
    "organization unchanged",
    updatedProject.organization.id,
    originalOrganizationId,
  );
  // 7. Verify project status remains 'active' since status was not provided in update
  TestValidator.equals(
    "status remains active",
    updatedProject.status,
    "active",
  );
}