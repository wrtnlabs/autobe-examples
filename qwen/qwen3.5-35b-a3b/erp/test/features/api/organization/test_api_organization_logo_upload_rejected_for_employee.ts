import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organization_members_create } from "../../../generate/generate_random_hrms_member_organization_members_create";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";

/**
 * Test that a member with Employee role (not Owner or Manager) is rejected when attempting to upload an organization logo.
 *
 * This test validates role-based access control for organization logo updates:
 * - Owner and Manager roles should be able to upload logos
 * - Employee role should be rejected with 403 Forbidden
 *
 * The test creates an organization with an Owner member, then adds an Employee member
 * and attempts logo upload with the Employee's credentials, verifying the system
 * properly enforces permissions.
 */
export async function test_api_organization_logo_upload_rejected_for_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create organization owner (first member)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      href: "https://test.example.com/join",
      referrer: "https://test.example.com",
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(ownerAuth);
  // Extract organization from owner's membership (first member becomes owner)
  const ownerMembership = ownerAuth.organization_memberships[0];
  typia.assert(ownerMembership);
  const organizationId = ownerMembership.organization.id;
  typia.assert(organizationId);
  // 2. Create second member account (will be assigned as Employee)
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      href: "https://test.example.com/join",
      referrer: "https://test.example.com",
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(employeeAuth);
  const employeeId = employeeAuth.id;
  typia.assert(employeeId);
  // 3. Create Employee role ID (typical pattern: use random UUID for testing)
  // In real scenario, this would be obtained from organization roles list
  const employeeRoleId = typia.random<string & tags.Format<"uuid">>();
  // 4. Assign employee to organization with Employee role
  const employeeMembership =
    await generate_random_hrms_member_organization_members_create(
      employeeConnection,
      {
        body: {
          hrms_member_id: employeeId,
          hrms_organization_id: organizationId,
          hrms_organization_role_id: employeeRoleId,
        } satisfies IHrmsOrganizationMember.ICreate,
      },
    );
  typia.assert(employeeMembership);
  // 5. Attempt logo upload with Employee role connection
  await TestValidator.httpError(
    "employee should not be able to upload organization logo",
    403,
    async () => {
      await api.functional.hrms.member.organizations.logo.updateLogo(
        employeeConnection,
        {
          organizationId: organizationId,
          body: {
            file: "test-image-data.png",
          } satisfies IHrmsOrganization.IUpdateLogo,
        },
      );
    },
  );
}
