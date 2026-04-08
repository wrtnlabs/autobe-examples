import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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
import { generate_random_hrm_platform_member_employee_invitations_create } from "../../../generate/generate_random_hrm_platform_member_employee_invitations_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

/**
 * Test organization deletion is rejected when active employees exist.
 *
 * Validates the business rule that an organization cannot be deleted while it has active employees or pending employee invitations assigned to it. This is a critical data integrity check to prevent orphaned employee records and ensure proper cleanup procedures are followed before organization deletion.
 *
 * The test creates a complete organizational structure including an owner member, the organization itself, and at least one employee invitation representing a pending employee relationship. It then attempts to delete the organization and verifies that the operation is rejected with an appropriate error indicating that employees must be removed first.
 *
 * Note: This test focuses on the blocking behavior validation. The complete flow including employee removal and successful deletion would require additional endpoints for employee management that are not available in the current API set.
 *
 * 1. Register new member account who will become organization owner.
 * 2. Create organization with the member as owner using the authenticated connection.
 * 3. Create employee invitation which establishes an employee relationship in the organization.
 * 4. Attempt to delete organization - expect rejection with error indicating employees must be removed first.
 * 5. Validate that the deletion operation was rejected, confirming the business rule is enforced.
 */
export async function test_api_organization_deletion_blocked_by_active_employees(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account who will become organization owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(owner);
  // 2. Create organization with the member as owner
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create employee invitation which establishes an employee relationship
  // Note: In a complete test environment, we would fetch the actual Employee role ID
  // from the organization's built-in roles. For this test, we generate a UUID.
  // The invitation creates either an active employee (if email has account) or
  // a pending invitation, both of which should block organization deletion.
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const invitation =
    await generate_random_hrm_platform_member_employee_invitations_create(
      ownerConnection,
      {
        body: {
          email: employeeEmail,
          role_id: typia.random<string & tags.Format<"uuid">>(),
          employment_type: "full-time",
          expires_at: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 30,
          ).toISOString(),
        } satisfies IHrmPlatformEmployeeInvitation.ICreate,
      },
    );
  typia.assert(invitation);
  // 4. Attempt to delete organization - expect rejection with error
  // The organization should not be deletable because there's an active employee relationship
  // (either active employee or pending invitation)
  await TestValidator.error(
    "organization deletion blocked by active employees",
    async () => {
      await api.functional.hrmPlatform.member.organizations.erase(
        ownerConnection,
        {
          organizationId: organization.id,
        },
      );
    },
  );
  // 5. The error test above confirms the deletion was rejected
  // Additional verification steps (employee removal, timesheet checks, successful deletion)
  // would require additional API endpoints not available in the current API set
}
