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
 * Test multi-tenancy data isolation preventing cross-organization department deletion.
 *
 * Validates that the department deletion endpoint strictly scopes queries to the authenticated member's current organization context via hrm_platform_organization_id. When a member from Organization A provides a departmentId that belongs to Organization B, the system cannot find any matching record within Organization A's context and returns 404 Not Found. This ensures complete data isolation between organizational tenants while also preventing information leakage about the existence of foreign resources.
 *
 * 1. Register and authenticate member for Organization A.
 * 2. Register and authenticate member for Organization B.
 * 3. Create a department in Organization B using Organization B's authenticated connection.
 * 4. Attempt to delete Organization B's department using Organization A's authenticated connection with the departmentId.
 * 5. Validate that the deletion returns 404 Not Found, confirming cross-organization access is blocked.
 */
export async function test_api_department_cross_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member for Organization A
  const orgAConnection: api.IConnection = { host: connection.host };
  const orgAMember = await authorize_member_join(orgAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(orgAMember);
  // 2. Register and authenticate member for Organization B
  const orgBConnection: api.IConnection = { host: connection.host };
  const orgBMember = await authorize_member_join(orgBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(orgBMember);
  // 3. Create a department in Organization B using Organization B's connection
  const department =
    await generate_random_hrm_platform_member_departments_create(
      orgBConnection,
      {},
    );
  typia.assert(department);
  // 4. Attempt to delete Organization B's department using Organization A's connection
  // This should return 404 because the department exists in Organization B, not Organization A
  await TestValidator.httpError(
    "cross-organization department deletion returns 404",
    404,
    async () => {
      await api.functional.hrmPlatform.member.departments.erase(
        orgAConnection,
        {
          departmentId: department.id,
        },
      );
    },
  );
}
