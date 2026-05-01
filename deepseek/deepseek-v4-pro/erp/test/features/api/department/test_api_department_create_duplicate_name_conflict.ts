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
 * Test department name uniqueness constraint within an organization.
 *
 * Validates that creating a department with a name that already exists in the
 * same organization is rejected with a 409 Conflict response. The
 * organization-wide department name uniqueness constraint is enforced by
 * the @@unique([erp_hrm_organization_id, name]) database index.
 *
 * 1. Member authenticates via join to obtain department management permissions.
 * 2. Creates a department with a distinctive name.
 * 3. Attempts to create another department with the exact same name.
 * 4. Verifies the second attempt is rejected with HTTP 409 Conflict.
 */
export async function test_api_department_create_duplicate_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create first department with a distinctive name
  const departmentName = RandomGenerator.paragraph({ sentences: 2 });
  const department = await generate_random_erp_hrm_member_departments_create(
    memberConnection,
    { body: { name: departmentName } },
  );
  typia.assert(department);
  TestValidator.equals(
    "department name matches input",
    department.name,
    departmentName,
  );
  // 3. Verify duplicate name is rejected with 409
  await TestValidator.httpError("duplicate department name", 409, () =>
    generate_random_erp_hrm_member_departments_create(memberConnection, {
      body: { name: departmentName },
    }),
  );
}
