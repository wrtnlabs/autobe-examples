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

export async function test_api_department_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
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
  // Create a department to retrieve
  const createdDepartment =
    await generate_random_erp_hrm_admin_departments_create(adminConnection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    });
  typia.assert(createdDepartment);
  // Retrieve the department by ID
  const retrievedDepartment = await api.functional.erpHrm.admin.departments.at(
    adminConnection,
    {
      departmentId: createdDepartment.id,
    },
  );
  typia.assert(retrievedDepartment);
  // Validate retrieved department matches created department
  TestValidator.equals(
    "department ID matches",
    retrievedDepartment.id,
    createdDepartment.id,
  );
  TestValidator.equals(
    "department name matches",
    retrievedDepartment.name,
    createdDepartment.name,
  );
  TestValidator.equals(
    "department description matches",
    retrievedDepartment.description,
    createdDepartment.description,
  );
  TestValidator.equals(
    "organization ID matches",
    retrievedDepartment.organization.id,
    createdDepartment.organization.id,
  );
  TestValidator.equals(
    "department is active",
    retrievedDepartment.deleted_at,
    null,
  );
}
