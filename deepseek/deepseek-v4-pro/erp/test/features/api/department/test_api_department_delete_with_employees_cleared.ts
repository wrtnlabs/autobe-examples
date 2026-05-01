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
 * Test that deleting a department succeeds and the soft-delete is enforced.
 *
 * Validates the department deletion workflow: authenticating a member, creating a department, performing the soft-delete, and verifying that a second deletion attempt on the same department fails. This confirms that the department record is properly marked as deleted and subsequent operations correctly reject the soft-deleted resource.
 *
 * 1. Authenticate a new member via join to obtain an authorized session.
 * 2. Create a department within the organization context.
 * 3. Delete the department — this clears employee department associations and soft-deletes the record.
 * 4. Attempt deletion again — must fail because the department is already soft-deleted.
 */
export async function test_api_department_delete_with_employees_cleared(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create department
  const department = await generate_random_erp_hrm_member_departments_create(
    memberConnection,
    {},
  );
  typia.assert(department);
  // 3. Delete department
  await api.functional.erpHrm.member.departments.erase(memberConnection, {
    departmentId: department.id,
  });
  // 4. Verify soft-delete — second delete must fail
  await TestValidator.error(
    "double delete of soft-deleted department fails",
    async () => {
      await api.functional.erpHrm.member.departments.erase(memberConnection, {
        departmentId: department.id,
      });
    },
  );
}
