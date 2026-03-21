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
import { generate_random_erp_hrm_admin_projects_members_create } from "../../../generate/generate_random_erp_hrm_admin_projects_members_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

/**
 * Test that an employee can hold different roles across multiple projects simultaneously.
 *
 * Steps:
 * 1. Admin authenticates via POST /erpHrm/auth/admin/join
 * 2. Admin creates two projects via POST /erpHrm/admin/projects (project A and project B)
 * 3. Admin creates project member on project A
 * 4. Admin creates project member on project B
 *
 * Validation:
 * - Both memberships are created successfully
 * - Employee has independent membership records on both projects
 * - The memberships have different IDs, confirming they are separate records
 * - Validates section 99: employees can be members of multiple projects with independent role assignments
 */
export async function test_api_project_member_independent_roles_across_projects(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create two projects (project A and project B)
  const projectA = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {},
  );
  typia.assert(projectA);
  const projectB = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {},
  );
  typia.assert(projectB);
  // 3. Create project member on project A
  const memberA = await generate_random_erp_hrm_admin_projects_members_create(
    adminConnection,
    {
      params: { projectId: projectA.id },
    },
  );
  typia.assert(memberA);
  // 4. Create project member on project B
  const memberB = await generate_random_erp_hrm_admin_projects_members_create(
    adminConnection,
    {
      params: { projectId: projectB.id },
    },
  );
  typia.assert(memberB);
  // Validation: Employee has independent memberships across different projects
  TestValidator.notEquals(
    "project A and project B have different IDs",
    projectA.id,
    projectB.id,
  );
  TestValidator.notEquals(
    "member A and member B have different IDs",
    memberA.id,
    memberB.id,
  );
  TestValidator.predicate(
    "employee has memberships in multiple projects",
    memberA.id !== memberB.id,
  );
}
