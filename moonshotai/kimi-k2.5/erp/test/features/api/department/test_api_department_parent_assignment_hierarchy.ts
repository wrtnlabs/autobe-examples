import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_departments_create } from "../../../generate/generate_random_erp_hrm_member_departments_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_department_parent_assignment_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member with organization management permission
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create organization context
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create parent department (top-level)
  const parentDepartment =
    await generate_random_erp_hrm_member_departments_create(memberConnection, {
      body: {
        name: `Parent-${RandomGenerator.alphabets(8)}`,
        description: "Top-level parent department for hierarchy test",
        parentDepartmentId: null,
      },
    });
  typia.assert(parentDepartment);
  // Verify parent is top-level (no parent)
  TestValidator.equals(
    "parent department is top-level",
    parentDepartment.parentDepartment,
    null,
  );
  // 4. Create child department (initially top-level)
  const childDepartment =
    await generate_random_erp_hrm_member_departments_create(memberConnection, {
      body: {
        name: `Child-${RandomGenerator.alphabets(8)}`,
        description: "Child department to test parent assignment",
        parentDepartmentId: null,
      },
    });
  typia.assert(childDepartment);
  // Verify child is initially top-level
  TestValidator.equals(
    "child department initially top-level",
    childDepartment.parentDepartment,
    null,
  );
  // 5. Update child department to assign parent
  const updatedChild = await api.functional.erpHrm.member.departments.update(
    memberConnection,
    {
      departmentId: childDepartment.id,
      body: {
        parentDepartmentId: parentDepartment.id,
      } satisfies IErpHrmDepartment.IUpdate,
    },
  );
  typia.assert(updatedChild);
  // 6. Verify parent relationship is established
  TestValidator.notEquals(
    "child department now has parent",
    updatedChild.parentDepartment,
    null,
  );
  TestValidator.equals(
    "parent department id matches",
    updatedChild.parentDepartment?.id,
    parentDepartment.id,
  );
  TestValidator.equals(
    "parent department name matches",
    updatedChild.parentDepartment?.name,
    parentDepartment.name,
  );
}
