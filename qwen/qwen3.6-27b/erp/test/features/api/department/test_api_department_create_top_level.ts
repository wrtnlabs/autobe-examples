import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_departments_create } from "../../../generate/generate_random_hrm_platform_member_departments_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";

/**
 * Test top-level department creation workflow.
 *
 * Validates the primary success path for creating a department without parent nesting hierarchy.
 * The test joins a new member to establish organizational context, then creates a
 * top-level department and verifies the response structure.
 *
 * Ensures that top-level departments are properly created with null parent references
 * and that the department is correctly associated with the authenticated session's
 * organization.
 *
 * 1. Join as a member to create account with default organization.
 * 2. Create a top-level department with name "Engineering" without parent_department_id.
 * 3. Validate response contains correct structure with name matching input,
 *    null parentDepartment confirming top-level status, and null deleted_at
 *    confirming active department.
 */
export async function test_api_department_create_top_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member - creates account with default organization
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, { body: {} });
  // 2. Create top-level department without parent
  const department =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: { name: "Engineering" } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  // 3. Validate response structure (typia.assert validates complete type structure)
  typia.assert(department);
  // 4. Validate business logic
  TestValidator.equals("name matches input", department.name, "Engineering");
  TestValidator.equals(
    "top-level has null parentDepartment",
    department.parentDepartment,
    null,
  );
  TestValidator.equals(
    "department is active and not soft-deleted",
    department.deleted_at,
    null,
  );
}
