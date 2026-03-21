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

export async function test_api_department_update_assign_valid_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin with org:manage permission
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a root-level parent department 'Technology'
  const parentDepartment = await api.functional.erpHrm.admin.departments.create(
    adminConnection,
    {
      body: {
        name: "Technology",
        description: "Parent technology department",
      } satisfies IErpHrmDepartment.ICreate,
    },
  );
  typia.assert(parentDepartment);
  // 3. Create a child department 'Frontend' without parent initially
  const childDepartment = await api.functional.erpHrm.admin.departments.create(
    adminConnection,
    {
      body: {
        name: "Frontend",
        description: "Frontend development team",
      } satisfies IErpHrmDepartment.ICreate,
    },
  );
  typia.assert(childDepartment);
  // 4. Update the 'Frontend' department to set its parent_id to the 'Technology' department
  const updatedDepartment =
    await api.functional.erpHrm.admin.departments.update(adminConnection, {
      departmentId: childDepartment.id,
      body: {
        name: childDepartment.name,
        description: childDepartment.description ?? null,
        parent_id: parentDepartment.id,
      } satisfies IErpHrmDepartment.IUpdate,
    });
  typia.assert(updatedDepartment);
  // 5. Validate the response
  TestValidator.equals(
    "department id preserved",
    updatedDepartment.id,
    childDepartment.id,
  );
  TestValidator.equals(
    "department name preserved",
    updatedDepartment.name,
    childDepartment.name,
  );
  TestValidator.equals(
    "parent_id matches parent department",
    updatedDepartment.parent?.id,
    parentDepartment.id,
  );
  TestValidator.predicate(
    "parent relationship established",
    updatedDepartment.parent !== null && updatedDepartment.parent !== undefined,
  );
}
