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
 * Test retrieving a department by its unique identifier.
 *
 * Validates that an authenticated member can fetch a department record by ID
 * and receive the complete department with all expected fields. The test
 * covers the basic retrieval flow for a top-level department with no parent.
 *
 * 1. Member joins and authenticates to obtain session context.
 * 2. A top-level department is created via the creation endpoint.
 * 3. The department is retrieved by its generated ID.
 * 4. All response fields are validated: id, name, description, parent (null),
 *    and the soft-delete marker.
 */
export async function test_api_department_retrieve_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a top-level department
  const department = await generate_random_erp_hrm_member_departments_create(
    memberConnection,
    {},
  );
  // 3. Retrieve the department by its ID
  const retrieved = await api.functional.erpHrm.member.departments.at(
    memberConnection,
    { departmentId: department.id },
  );
  typia.assert(retrieved);
  // 4. Validate the retrieved department matches the created one
  TestValidator.equals("department id matches", retrieved.id, department.id);
  TestValidator.equals(
    "department name matches",
    retrieved.name,
    department.name,
  );
  TestValidator.equals(
    "department description matches",
    retrieved.description,
    department.description,
  );
  TestValidator.equals(
    "parent is null for top-level department",
    retrieved.parent,
    null,
  );
  TestValidator.equals(
    "deleted_at is null for active department",
    retrieved.deleted_at,
    null,
  );
}
