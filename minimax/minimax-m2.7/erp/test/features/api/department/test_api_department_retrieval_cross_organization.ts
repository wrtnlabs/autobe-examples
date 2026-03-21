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

export async function test_api_department_retrieval_cross_organization(
  connection: api.IConnection,
): Promise<void> {
  // ============================================================
  // SCENARIO: Test retrieving a department that belongs to a different organization returns 404
  //
  // This validates data isolation between organizations - admins should not be able
  // to determine whether a department exists in other organizations.
  // ============================================================
  // Step 1: Authenticate as first admin in Organization A
  const adminAConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Step 2: Create a department in Organization A
  const department = await generate_random_erp_hrm_admin_departments_create(
    adminAConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(department);
  // Step 3: Authenticate as second admin in Organization B (different organization)
  const adminBConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Step 4: Attempt to retrieve the department from Organization A using Organization B's credentials
  // Expect 404 status code - not 403, for security reasons (don't reveal existence)
  await TestValidator.httpError(
    "department from different organization returns 404",
    404,
    async () =>
      await api.functional.erpHrm.admin.departments.at(adminBConnection, {
        departmentId: department.id,
      }),
  );
}
