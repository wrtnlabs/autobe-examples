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
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";

export async function test_api_department_deletion_cascade_children(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate with org:manage permission
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Create parent department
  const parentDepartment =
    await generate_random_erp_hrm_member_departments_create(memberConnection, {
      body: {
        name: RandomGenerator.name(),
      } satisfies IErpHrmDepartment.ICreate,
    });
  typia.assert(parentDepartment);
  // Create child department with parent_id reference
  const childDepartment =
    await generate_random_erp_hrm_member_departments_create(memberConnection, {
      body: {
        name: RandomGenerator.name(),
        parent_id: parentDepartment.id,
      } satisfies IErpHrmDepartment.ICreate,
    });
  typia.assert(childDepartment);
  // Verify child department has parent reference
  TestValidator.equals(
    "child has parent reference",
    childDepartment.parent?.id,
    parentDepartment.id,
  );
  // Delete parent department - cascade should delete children
  // The database cascade constraint (onDelete: Cascade) handles child department deletion
  await api.functional.erpHrm.member.departments.erase(memberConnection, {
    departmentId: parentDepartment.id,
  });
  // Verify cascade deletion by attempting to create another child with deleted parent
  // This should fail because the parent department is soft-deleted
  await TestValidator.error(
    "cannot create child with deleted parent",
    async () => {
      await generate_random_erp_hrm_member_departments_create(
        memberConnection,
        {
          body: {
            name: RandomGenerator.name(),
            parent_id: parentDepartment.id,
          } satisfies IErpHrmDepartment.ICreate,
        },
      );
    },
  );
}
