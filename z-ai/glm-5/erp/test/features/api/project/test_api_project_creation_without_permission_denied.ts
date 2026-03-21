import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_project_creation_without_permission_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create organization owner (first member) with full permissions
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(ownerAuth);
  // 2. Create a custom role without 'project:manage' permission
  const role = await generate_random_erp_hrm_member_roles_create(
    ownerConnection,
    {
      body: {
        name: "restricted_employee",
        permissions: [
          "employee:view",
          "project:view",
          "time:view_all",
          "report:view",
        ] satisfies IErpHrmRole.ICreate["permissions"],
      },
    },
  );
  typia.assert(role);
  // 3. Create a second member who will have restricted permissions
  const restrictedConnection: api.IConnection = { host: connection.host };
  const restrictedAuth = await authorize_member_join(restrictedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(restrictedAuth);
  // 4. Add the restricted member as an employee with the restricted role
  const employee = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    {
      body: {
        email: restrictedAuth.email,
        roleId: role.id,
        employmentType: "full_time",
      },
    },
  );
  typia.assert(employee);
  // 5. Attempt to create a project as the restricted member (should fail with 403)
  await TestValidator.httpError(
    "project creation should fail with 403 for member without project:manage permission",
    403,
    async () => {
      await api.functional.erpHrm.member.projects.create(restrictedConnection, {
        body: {
          name: RandomGenerator.name(),
          color_code: "#FF5733",
        } satisfies IErpHrmProject.ICreate,
      });
    },
  );
}
