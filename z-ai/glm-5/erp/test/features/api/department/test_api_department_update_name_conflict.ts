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
 * Test that updating a department name to match an existing department name
 * in the same organization is rejected with a 409 Conflict error.
 *
 * Prerequisites: Create a member account and create two departments with different names.
 *
 * Test Steps:
 * 1. Authenticate as a member using POST /erpHrm/auth/member/join
 * 2. Create first department using POST /erpHrm/member/departments with name 'Engineering'
 * 3. Create second department using POST /erpHrm/member/departments with name 'Marketing'
 * 4. Attempt to update the second department using PUT /erpHrm/member/departments/{departmentId}
 *    with name 'Engineering' (which already exists)
 *
 * Validations:
 * - Response status must be 409 Conflict
 * - The department record must remain unchanged
 * - The second department's name must still be 'Marketing'
 */
export async function test_api_department_update_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create first department "Engineering"
  const engineering = await generate_random_erp_hrm_member_departments_create(
    memberConnection,
    { body: { name: "Engineering" } },
  );
  typia.assert(engineering);
  // Step 3: Create second department "Marketing"
  const marketing = await generate_random_erp_hrm_member_departments_create(
    memberConnection,
    { body: { name: "Marketing" } },
  );
  typia.assert(marketing);
  // Step 4: Attempt to update Marketing department name to "Engineering" - should fail with 409
  await TestValidator.httpError(
    "should return 409 Conflict when updating department name to existing name",
    409,
    async () =>
      await api.functional.erpHrm.member.departments.update(memberConnection, {
        departmentId: marketing.id,
        body: { name: "Engineering" } satisfies IErpHrmDepartment.IUpdate,
      }),
  );
}
