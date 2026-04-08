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

export async function test_api_department_creation_duplicate_name_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and establish authenticated session with org:manage permission
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  // 2. Generate a unique department name for the first department
  const departmentName = RandomGenerator.name(2);
  // 3. Create the first department successfully
  const firstDepartment = await api.functional.erpHrm.admin.departments.create(
    adminConnection,
    {
      body: {
        name: departmentName,
        description: "First department with this unique name",
      } satisfies IErpHrmDepartment.ICreate,
    },
  );
  typia.assert(firstDepartment);
  // 4. Attempt to create a second department with the identical name
  // This should be rejected due to unique name constraint
  await TestValidator.error("duplicate department name rejection", async () => {
    await api.functional.erpHrm.admin.departments.create(adminConnection, {
      body: {
        name: departmentName,
        description: "Second department with duplicate name",
      } satisfies IErpHrmDepartment.ICreate,
    });
  });
}
