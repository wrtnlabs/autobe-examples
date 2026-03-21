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

/**
 * Test retrieving a soft-deleted department returns 404 not found.
 *
 * Prerequisites:
 * 1. Authenticate as admin via POST /erpHrm/auth/admin/join
 * 2. Create a department via POST /erpHrm/admin/departments
 * 3. Delete the department via DELETE /erpHrm/admin/departments/{departmentId}
 *
 * Test steps:
 * 1. Send GET request to /erpHrm/admin/departments/{departmentId} with the soft-deleted department's UUID
 * 2. Verify response returns 404 status code
 * 3. Verify response body contains appropriate error message indicating department not found
 *
 * This validates that soft-deleted departments are properly hidden from retrieval to maintain data privacy.
 */
export async function test_api_department_retrieval_soft_deleted(
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
    },
  });
  // 2. Create a department
  const department: IErpHrmDepartment =
    await generate_random_erp_hrm_admin_departments_create(adminConnection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    });
  typia.assert(department);
  // 3. Delete the department (soft-delete)
  await api.functional.erpHrm.admin.departments.erase(adminConnection, {
    departmentId: department.id,
  });
  // 4. Verify retrieving soft-deleted department returns 404
  await TestValidator.httpError(
    "soft-deleted department should return 404",
    404,
    async () =>
      await api.functional.erpHrm.admin.departments.at(adminConnection, {
        departmentId: department.id,
      }),
  );
}
