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

export async function test_api_department_update_hierarchy_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create parent department 'Technology Division'
  const parentDepartment =
    await generate_random_erp_hrm_admin_departments_create(adminConnection, {
      body: {
        name: "Technology Division",
        description: "Parent department for technology teams",
        parentId: null, // root level
      } satisfies IErpHrmDepartment.ICreate,
    });
  typia.assert(parentDepartment);
  TestValidator.equals(
    "parent department parent is null",
    parentDepartment.parent,
    null,
  );
  // 3. Create child department 'Frontend Team' with parentId pointing to 'Technology Division'
  const childDepartment =
    await generate_random_erp_hrm_admin_departments_create(adminConnection, {
      body: {
        name: "Frontend Team",
        description: "Frontend development team",
        parentId: parentDepartment.id,
      } satisfies IErpHrmDepartment.ICreate,
    });
  typia.assert(childDepartment);
  TestValidator.equals(
    "child department has parent",
    childDepartment.parent !== null,
    true,
  );
  TestValidator.equals(
    "child department parent id matches",
    childDepartment.parent!.id,
    parentDepartment.id,
  );
  // 4. Update child department to remove parent (make it root-level)
  const updatedDepartmentNoParent =
    await api.functional.erpHrm.admin.departments.update(adminConnection, {
      departmentId: childDepartment.id,
      body: {
        parentId: null,
      } satisfies IErpHrmDepartment.IUpdate,
    });
  typia.assert(updatedDepartmentNoParent);
  TestValidator.equals(
    "department now has no parent",
    updatedDepartmentNoParent.parent,
    null,
  );
  // 5. Update department again to restore hierarchy
  const updatedDepartmentWithParent =
    await api.functional.erpHrm.admin.departments.update(adminConnection, {
      departmentId: childDepartment.id,
      body: {
        parentId: parentDepartment.id,
      } satisfies IErpHrmDepartment.IUpdate,
    });
  typia.assert(updatedDepartmentWithParent);
  TestValidator.equals(
    "department has parent again",
    updatedDepartmentWithParent.parent !== null,
    true,
  );
  TestValidator.equals(
    "parent id matches",
    updatedDepartmentWithParent.parent!.id,
    parentDepartment.id,
  );
  TestValidator.equals(
    "parent name matches",
    updatedDepartmentWithParent.parent!.name,
    parentDepartment.name,
  );
}
