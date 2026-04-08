import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeInvitation";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_invitations_create } from "../../../generate/generate_random_hrm_member_invitations_create";
import { prepare_random_hrm_employee_invitation } from "../../../prepare/prepare_random_hrm_employee_invitation";

/**
 * Test invitation access denied by employee role.
 *
 * Validates that members with Employee role who lack the employee:manage permission receive a 403 Forbidden error when attempting to retrieve employee invitation details. This test ensures proper permission-based access control is enforced on invitation endpoints.
 *
 * The test follows these steps:
 * 1. Register and authenticate a Manager user who has employee:manage permission
 * 2. Create an employee invitation using the Manager's authenticated connection
 * 3. Register and authenticate an Employee user who does NOT have employee:manage permission
 * 4. Attempt to retrieve the created invitation using the Employee's connection
 * 5. Validate that the API returns 403 Forbidden error
 *
 * This validates that invitation access is properly restricted to users with appropriate permissions (employee:manage or organization owner role), preventing regular employees from viewing sensitive invitation information.
 */
export async function test_api_invitation_access_denied_by_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate Manager user with employee:manage permission
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(managerAuth);
  // 2. Create an employee invitation using Manager's connection
  // This should succeed as Manager has employee:manage permission
  const invitation = await generate_random_hrm_member_invitations_create(
    managerConnection,
    {},
  );
  typia.assert(invitation);
  // 3. Register and authenticate Employee user WITHOUT employee:manage permission
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(employeeAuth);
  // 4. Attempt to retrieve the invitation using Employee's connection
  // This should fail with 403 Forbidden error due to missing employee:manage permission
  await TestValidator.httpError(
    "employee should not be able to retrieve invitation without employee:manage permission",
    403,
    async () => {
      await api.functional.hrm.member.invitations.at(employeeConnection, {
        invitationId: invitation.id,
      });
    },
  );
}
