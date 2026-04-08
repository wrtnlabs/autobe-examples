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

export async function test_api_department_creation_with_name_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account with org:manage permission
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create department with only required name field
  const departmentName = RandomGenerator.name();
  const department: IErpHrmDepartment =
    await api.functional.erpHrm.admin.departments.create(adminConnection, {
      body: {
        name: departmentName,
      } satisfies IErpHrmDepartment.ICreate,
    });
  typia.assert(department);
  // 3. Validate response
  TestValidator.equals("name matches input", department.name, departmentName);
  TestValidator.equals("description is null", department.description, null);
  TestValidator.equals("parent is null", department.parent, null);
  TestValidator.equals("deleted_at is null", department.deleted_at, null);
  TestValidator.predicate(
    "has valid UUID id",
    /^[0-9a-f-]{36}$/i.test(department.id),
  );
  TestValidator.predicate(
    "has organization context",
    department.organization !== undefined && department.organization !== null,
  );
  TestValidator.predicate(
    "has created_at timestamp",
    department.created_at !== undefined && department.created_at !== null,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    department.updated_at !== undefined && department.updated_at !== null,
  );
}
