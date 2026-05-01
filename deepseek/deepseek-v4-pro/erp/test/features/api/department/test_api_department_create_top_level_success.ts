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
 * Test top-level department creation with member authentication.
 *
 * Validates that an authenticated member with org:manage permission can create
 * a top-level department and receives a complete department record. The test
 * confirms the response includes a generated UUID id, the provided name and
 * description, a null parent reference confirming top-level status, the
 * organization ID from the session context as a valid UUID, and a null
 * deleted_at confirming the department is active.
 *
 * Special attention is given to verifying that the parent field is null for
 * top-level departments and that deleted_at is null for newly created active
 * departments — both critical for correct hierarchy rendering and soft-delete
 * filtering in downstream consumers.
 *
 * 1. Authenticate as a member via join to obtain org:manage permission.
 * 2. Create a top-level department with a known name and a random description.
 * 3. Validate the full response structure with typia.assert.
 * 4. Verify business-level field values match expectations.
 */
export async function test_api_department_create_top_level_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a top-level department
  const departmentName = "Engineering";
  const departmentDescription = RandomGenerator.paragraph({ sentences: 3 });
  const department = await generate_random_erp_hrm_member_departments_create(
    memberConnection,
    {
      body: {
        name: departmentName,
        description: departmentDescription,
      },
    },
  );
  typia.assert(department);
  // 3. Verify department properties
  TestValidator.equals("name matches input", department.name, departmentName);
  TestValidator.equals(
    "description matches input",
    department.description,
    departmentDescription,
  );
  TestValidator.equals("parent is null (top-level)", department.parent, null);
  TestValidator.equals(
    "deleted_at is null (active)",
    department.deleted_at,
    null,
  );
  TestValidator.predicate("erp_hrm_organization_id is a valid UUID", () =>
    typia.is<string & tags.Format<"uuid">>(department.erp_hrm_organization_id),
  );
}
