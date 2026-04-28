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
 * Test retrieving a department's details after it has been soft-deleted.
 *
 * Validates that soft-deleted departments are correctly excluded from active retrieval results. Verifies the business rule that deleted organizational structures cannot be accessed as active entities, ensuring data integrity and proper soft-delete implementation.
 *
 * Edge cases verified:
 * - Soft-deleted department must return 404 when retrieved via detail endpoint
 *
 * 1. Join a new member account, which automatically creates a default organization.
 * 2. Create a department within the organization.
 * 3. Soft-delete the department using the DELETE endpoint.
 * 4. Attempt to retrieve the soft-deleted department using the GET endpoint.
 * 5. Validate that retrieval fails with HTTP 404 Not Found.
 */
export async function test_api_department_retrieval_excludes_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and join
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  // 2. Create a department
  const department =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {},
    );
  typia.assert(department);
  // 3. Soft-delete the department
  await api.functional.hrmPlatform.member.departments.erase(memberConnection, {
    departmentId: department.id,
  });
  // 4 & 5. Attempt to retrieve the soft-deleted department and validate 404 error
  await TestValidator.httpError(
    "soft-deleted department returns 404 when retrieved",
    404,
    async () =>
      await api.functional.hrmPlatform.member.departments.at(memberConnection, {
        departmentId: department.id,
      }),
  );
}
