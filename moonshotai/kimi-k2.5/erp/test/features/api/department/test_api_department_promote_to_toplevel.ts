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

export async function test_api_department_promote_to_toplevel(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member with organization management permission
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Create organization context
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(organization);
  // 3. Create parent department (top-level)
  const parentDepartment =
    await generate_random_erp_hrm_member_departments_create(memberConnection, {
      body: {
        name: typia.random<string & tags.MinLength<1> & tags.MaxLength<255>>(),
        description: null,
      },
    });
  typia.assert(parentDepartment);
  // 4. Create child department assigned to parent
  const childDepartment =
    await generate_random_erp_hrm_member_departments_create(memberConnection, {
      body: {
        name: typia.random<string & tags.MinLength<1> & tags.MaxLength<255>>(),
        description: null,
        parentDepartmentId: parentDepartment.id,
      },
    });
  typia.assert(childDepartment);
  // Verify child has parent before promotion
  TestValidator.notEquals(
    "child department should have parent before promotion",
    childDepartment.parentDepartment,
    null,
  );
  // 5. Update child department to promote to top-level (clear parentDepartmentId)
  const updatedDepartment =
    await api.functional.erpHrm.member.departments.update(memberConnection, {
      departmentId: childDepartment.id,
      body: {
        parentDepartmentId: null,
      } satisfies IErpHrmDepartment.IUpdate,
    });
  typia.assert(updatedDepartment);
  // 6. Verify the department is now top-level
  TestValidator.equals(
    "department should be promoted to top-level",
    updatedDepartment.parentDepartment,
    null,
  );
}
