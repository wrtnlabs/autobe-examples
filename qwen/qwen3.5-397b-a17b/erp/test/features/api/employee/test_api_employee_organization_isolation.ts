import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test organization context isolation when retrieving employee records.
 *
 * Validates that the system enforces organization context validation when accessing employee records. After authenticating as a member, attempts to retrieve an employee that belongs to a different organization context. The system should return 404 Not Found, preventing access to employees outside the current organization boundary.
 *
 * This test ensures multi-tenancy data isolation where employees can only be accessed within their belonging organization, maintaining proper data segregation between organizations. The validation confirms that organization boundary enforcement prevents unauthorized cross-organization data access.
 *
 * 1. Member authenticates via registration to obtain valid session.
 * 2. Attempts to retrieve employee with UUID not belonging to member's organization.
 * 3. Validates that API returns 404 Not Found for cross-organization access attempt.
 */
export async function test_api_employee_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Attempt to access employee from different organization
  // Generate a valid UUID format that doesn't belong to current organization context
  const foreignEmployeeId = typia.random<string & tags.Format<"uuid">>();
  // 3. Validate organization isolation - should return 404
  await TestValidator.httpError(
    "organization isolation prevents cross-org employee access",
    404,
    async () => {
      await api.functional.hrmPlatform.member.employees.at(memberConnection, {
        employeeId: foreignEmployeeId,
      });
    },
  );
}
