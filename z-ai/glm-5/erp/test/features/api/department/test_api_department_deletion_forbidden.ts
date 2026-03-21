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

/**
 * Test that department deletion returns 403 Forbidden when attempted by
 * a member without org:manage permission.
 *
 * Authorization Boundary Test:
 * - Department deletion requires org:manage permission
 * - Only organization owners or users with org:manage role can delete departments
 * - This test validates the authorization check works correctly
 */
export async function test_api_department_deletion_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first member (owner with org:manage permission)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(ownerAuth);
  // Step 2: Create a department in the organization
  const department = await generate_random_erp_hrm_member_departments_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies DeepPartial<IErpHrmDepartment.ICreate>,
    },
  );
  typia.assert(department);
  // Step 3: Create second member (regular employee without org:manage permission)
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(employeeAuth);
  // Step 4 & 5: Attempt to delete the department as employee (should return 403)
  await TestValidator.httpError(
    "department deletion should return 403 for member without org:manage permission",
    403,
    async () => {
      await api.functional.erpHrm.member.departments.erase(employeeConnection, {
        departmentId: department.id,
      });
    },
  );
}
