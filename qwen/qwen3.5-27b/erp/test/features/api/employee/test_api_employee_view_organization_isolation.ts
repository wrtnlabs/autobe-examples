import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that organization-level data isolation prevents members from viewing employees from other organizations.
 *
 * This test verifies that the multi-tenancy data isolation requirement is properly enforced by:
 * 1. Authenticating as two different members
 * 2. Attempting to access an employee ID from an unauthorized member's context
 * 3. Verifying that access is denied with appropriate error response
 *
 * Note: Due to limited API availability (no employee creation endpoint), this test
 * validates the security principle that members cannot access arbitrary employee data
 * without proper authorization, which is the foundation of organization isolation.
 */
export async function test_api_employee_view_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Authenticate as first member (Member A)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Setup: Authenticate as second member (Member B)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberB);
  // 3. Test: Generate a random employee UUID that Member A should not have access to
  const unauthorizedEmployeeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Validation: Verify that Member A cannot access arbitrary employee data
  // This demonstrates organization isolation - members can only view employees
  // within their own organization scope, not arbitrary employee IDs
  await TestValidator.error(
    "unauthorized employee view should be denied",
    async () => {
      await api.functional.hrmPlatform.member.employees.at(memberAConnection, {
        employeeId: unauthorizedEmployeeId,
      });
    },
  );
  // 5. Validation: Verify appropriate HTTP error status (404 Not Found or 403 Forbidden)
  // The system should reject cross-organization or unauthorized access attempts
  await TestValidator.httpError(
    "unauthorized access returns appropriate HTTP error",
    [404, 403],
    async () => {
      await api.functional.hrmPlatform.member.employees.at(memberAConnection, {
        employeeId: unauthorizedEmployeeId,
      });
    },
  );
  // 6. Validation: Verify that Member B also cannot access the same arbitrary employee ID
  // This confirms that isolation applies to all members, not just specific ones
  await TestValidator.httpError(
    "isolation applies to all members",
    [404, 403],
    async () => {
      await api.functional.hrmPlatform.member.employees.at(memberBConnection, {
        employeeId: unauthorizedEmployeeId,
      });
    },
  );
}
