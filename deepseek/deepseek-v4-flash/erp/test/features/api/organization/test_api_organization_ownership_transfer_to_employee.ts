import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingInvitation";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_invitations_create } from "../../../generate/generate_random_hrm_time_tracking_member_invitations_create";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_organizations_roles_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_roles_create";
import { prepare_random_hrm_time_tracking_invitation } from "../../../prepare/prepare_random_hrm_time_tracking_invitation";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_role } from "../../../prepare/prepare_random_hrm_time_tracking_role";

/**
 * Test organization ownership transfer from the current owner to another active employee within the same organization.
 *
 * Validates the complete ownership transfer workflow including administrative setup, employee invitation, and transfer execution. Ensures that the organization's owner is updated to the target member, the organization's core attributes remain unchanged, and both parties' employee roles are updated accordingly.
 *
 * Special attention is given to handling the case where the invited email belongs to an existing registered member, which triggers automatic employee record creation. The target employee must have an active status for the transfer to succeed.
 *
 * 1. Register the first member who will become the organization owner, create an organization, and create a custom role.
 * 2. Register the second member who will receive ownership.
 * 3. Invite the second member's email to the organization via the owner's auth context — auto-creates an active employee record.
 * 4. Retrieve the target employee's ID by re-authenticating the second member.
 * 5. Transfer organization ownership to the target employee.
 * 6. Validate that ownership changed, organization attributes are preserved, and both parties' roles reflect the transfer.
 */
export async function test_api_organization_ownership_transfer_to_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register the first member (future organization owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackingMember.IJoin;
  const ownerAuthorized = await authorize_member_join(ownerConnection, {
    body: ownerJoinInput,
  });
  typia.assert(ownerAuthorized);
  const ownerId = ownerAuthorized.id;
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a custom role within the organization
  const customRole =
    await generate_random_hrm_time_tracking_member_organizations_roles_create(
      ownerConnection,
      {
        params: { organizationId: organization.id },
      },
    );
  typia.assert(customRole);
  // 4. Register the second member (target employee who will receive ownership)
  const targetConnection: api.IConnection = { host: connection.host };
  const targetJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackingMember.IJoin;
  const targetAuthorized = await authorize_member_join(targetConnection, {
    body: targetJoinInput,
  });
  typia.assert(targetAuthorized);
  const targetMemberId = targetAuthorized.id;
  // 5. Invite the second member's email to the organization
  // Since the email belongs to an existing registered member,
  // the system auto-creates an active employee record.
  const invitation =
    await generate_random_hrm_time_tracking_member_invitations_create(
      ownerConnection,
      {
        body: {
          email: targetJoinInput.email,
          role_id: customRole.id,
        },
      },
    );
  typia.assert(invitation);
  // 6. Re-authenticate the target member to get their updated employees array
  // The employee record was auto-created by the invitation.
  const targetReAuthenticated = await authorize_member_login(targetConnection, {
    body: {
      email: targetJoinInput.email,
      password: targetJoinInput.password,
      href: targetJoinInput.href,
      referrer: targetJoinInput.referrer,
    } satisfies IHrmTimeTrackingMember.ILogin,
  });
  typia.assert(targetReAuthenticated);
  // Find the target employee record for this organization
  const targetEmployee = targetReAuthenticated.employees.find(
    (e) => e.member.id === targetMemberId,
  );
  if (targetEmployee === undefined) {
    throw new Error("Target employee record not found after invitation");
  }
  // 7. Transfer ownership to the target employee
  const updatedOrganization =
    await api.functional.hrmTimeTracking.member.organizations.transfer_ownership.transferOwnership(
      ownerConnection,
      {
        organizationId: organization.id,
        body: {
          employee_id: targetEmployee.id,
        } satisfies IHrmTimeTrackingOrganization.ITransferOwnership,
      },
    );
  typia.assert(updatedOrganization);
  // 8. Validate that the organization owner changed to the target member
  TestValidator.equals(
    "owner changed",
    updatedOrganization.owner.id,
    targetMemberId,
  );
  // 9. Validate that organization attributes remain unchanged
  TestValidator.equals(
    "name unchanged",
    updatedOrganization.name,
    organization.name,
  );
  TestValidator.equals(
    "description unchanged",
    updatedOrganization.description,
    organization.description,
  );
  TestValidator.equals(
    "currency unchanged",
    updatedOrganization.currency,
    organization.currency,
  );
  TestValidator.equals(
    "timezone unchanged",
    updatedOrganization.timezone,
    organization.timezone,
  );
  TestValidator.equals(
    "fiscal_start_month unchanged",
    updatedOrganization.fiscal_start_month,
    organization.fiscal_start_month,
  );
  TestValidator.equals(
    "status unchanged",
    updatedOrganization.status,
    organization.status,
  );
  // 10. Re-authenticate the target member to verify their role changed to Owner
  const finalTargetAuth = await authorize_member_login(targetConnection, {
    body: {
      email: targetJoinInput.email,
      password: targetJoinInput.password,
      href: targetJoinInput.href,
      referrer: targetJoinInput.referrer,
    } satisfies IHrmTimeTrackingMember.ILogin,
  });
  typia.assert(finalTargetAuth);
  const finalTargetEmployee = finalTargetAuth.employees.find(
    (e) => e.member.id === targetMemberId,
  );
  if (finalTargetEmployee === undefined) {
    throw new Error("Target employee record not found after transfer");
  }
  TestValidator.equals(
    "target employee role is Owner",
    finalTargetEmployee.role.name,
    "Owner",
  );
  // 11. Re-authenticate the original owner to verify their role changed to Manager
  const finalOwnerAuth = await authorize_member_login(ownerConnection, {
    body: {
      email: ownerJoinInput.email,
      password: ownerJoinInput.password,
      href: ownerJoinInput.href,
      referrer: ownerJoinInput.referrer,
    } satisfies IHrmTimeTrackingMember.ILogin,
  });
  typia.assert(finalOwnerAuth);
  const finalOwnerEmployee = finalOwnerAuth.employees.find(
    (e) => e.member.id === ownerId,
  );
  if (finalOwnerEmployee === undefined) {
    throw new Error("Original owner employee record not found after transfer");
  }
  TestValidator.equals(
    "original owner role is Manager",
    finalOwnerEmployee.role.name,
    "Manager",
  );
}
