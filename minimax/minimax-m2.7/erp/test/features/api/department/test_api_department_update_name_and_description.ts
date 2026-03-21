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
  // Step 1: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Step 2: Create an initial department
  const initialDepartment =
    await generate_random_erp_hrm_admin_departments_create(adminConnection, {});
  typia.assert(initialDepartment);
  // Step 3: Verify the department was created successfully
  const createdAt = initialDepartment.created_at;
  TestValidator.equals(
    "department created",
    initialDepartment.name.length > 0,
    true,
  );
  // Step 4 & 5: Update the department name and description
  const updatedDepartment =
    await api.functional.erpHrm.admin.departments.update(adminConnection, {
      departmentId: initialDepartment.id,
      body: {
        name: "Engineering",
        description: "Handles all technical development",
      } satisfies IErpHrmDepartment.IUpdate,
    });
  typia.assert(updatedDepartment);
  // Validate updated department
  TestValidator.equals("name updated", updatedDepartment.name, "Engineering");
  TestValidator.equals(
    "description updated",
    updatedDepartment.description,
    "Handles all technical development",
  );
  TestValidator.equals(
    "created_at preserved",
    updatedDepartment.created_at,
    createdAt,
  );
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updatedDepartment.updated_at) >= new Date(createdAt),
  );
  TestValidator.equals(
    "organization preserved",
    updatedDepartment.organization.id,
    initialDepartment.organization.id,
  );
}
