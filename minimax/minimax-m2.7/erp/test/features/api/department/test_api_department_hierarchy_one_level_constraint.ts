import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_departments_create } from "../../../generate/generate_random_erp_hrm_admin_departments_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";

export async function test_api_department_hierarchy_one_level_constraint(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  // 2. Create parent department 'Engineering'
  const parentDepartment = await api.functional.erpHrm.admin.departments.create(
    adminConnection,
    {
      body: {
        name: "Engineering",
        description: "Parent engineering department",
      } satisfies IErpHrmDepartment.ICreate,
    },
  );
  typia.assert(parentDepartment);
  // 3. Create child department 'Frontend Team' with parent_id pointing to parent
  const childDepartment = await api.functional.erpHrm.admin.departments.create(
    adminConnection,
    {
      body: {
        name: "Frontend Team",
        description: "Child department under Engineering",
        parent_id: parentDepartment.id,
      } satisfies IErpHrmDepartment.ICreate,
    },
  );
  typia.assert(childDepartment);
  // 4. Verify child department has parent reference
  TestValidator.equals(
    "child department parent_id matches",
    childDepartment.parent?.id,
    parentDepartment.id,
  );
  // 5. Attempt to create grandchild department - should fail with HTTP 400
  await TestValidator.httpError(
    "grandchild department creation should fail due to one-level hierarchy constraint",
    400,
    async () =>
      await api.functional.erpHrm.admin.departments.create(adminConnection, {
        body: {
          name: "Frontend Module A",
          description: "Grandchild department - should fail",
          parent_id: childDepartment.id,
        } satisfies IErpHrmDepartment.ICreate,
      }),
  );
}
