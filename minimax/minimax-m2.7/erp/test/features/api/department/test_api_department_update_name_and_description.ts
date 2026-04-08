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

export async function test_api_department_update_name_and_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create initial department with name 'Engineering' and description 'Software engineering team'
  const initialDepartment =
    await generate_random_erp_hrm_admin_departments_create(adminConnection, {
      body: {
        name: "Engineering",
        description: "Software engineering team",
      } satisfies IErpHrmDepartment.ICreate,
    });
  typia.assert(initialDepartment);
  // Store original timestamp for comparison
  const originalCreatedAt = initialDepartment.created_at;
  const originalUpdatedAt = initialDepartment.updated_at;
  // 3. Update the department with new name and description
  const updatedDepartment =
    await api.functional.erpHrm.admin.departments.update(adminConnection, {
      departmentId: initialDepartment.id,
      body: {
        name: "Software Engineering",
        description: "All software development teams",
      } satisfies IErpHrmDepartment.IUpdate,
    });
  typia.assert(updatedDepartment);
  // 4. Validate the updated department
  TestValidator.equals(
    "department ID unchanged",
    updatedDepartment.id,
    initialDepartment.id,
  );
  TestValidator.equals(
    "updated name",
    updatedDepartment.name,
    "Software Engineering",
  );
  TestValidator.equals(
    "updated description",
    updatedDepartment.description,
    "All software development teams",
  );
  TestValidator.equals("parent remains null", updatedDepartment.parent, null);
  TestValidator.equals(
    "created_at unchanged",
    updatedDepartment.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at is newer or equal",
    updatedDepartment.updated_at >= originalUpdatedAt,
  );
}
