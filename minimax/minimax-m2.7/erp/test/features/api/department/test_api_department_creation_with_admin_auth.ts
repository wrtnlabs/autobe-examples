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

export async function test_api_department_creation_with_admin_auth(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized: IErpHrmAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {});
  // 2. Create a new department with the authenticated admin
  const department: IErpHrmDepartment =
    await generate_random_erp_hrm_admin_departments_create(adminConnection, {
      body: {
        name: "Engineering",
        description: "Engineering department for software development",
      } satisfies IErpHrmDepartment.ICreate,
    });
  // 3. Validate the response
  typia.assert(department);
  // Validate department id is UUID format
  TestValidator.predicate(
    "department id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      department.id,
    ),
  );
  // Validate name matches request
  TestValidator.equals(
    "department name matches",
    department.name,
    "Engineering",
  );
  // Validate organization is present
  TestValidator.predicate(
    "organization is present",
    department.organization !== null && department.organization !== undefined,
  );
  // Validate parent is null (root department)
  TestValidator.equals(
    "parent is null for root department",
    department.parent,
    null,
  );
  // Validate children is empty array or undefined
  TestValidator.predicate(
    "children is empty array",
    Array.isArray(department.children) && department.children.length === 0,
  );
  // Validate deleted_at is null (active department)
  TestValidator.equals(
    "deleted_at is null for active department",
    department.deleted_at,
    null,
  );
  // Validate timestamps are present
  TestValidator.predicate(
    "created_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(department.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(department.updated_at),
  );
}