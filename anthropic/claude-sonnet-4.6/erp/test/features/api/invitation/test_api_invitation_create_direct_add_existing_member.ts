import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_organizations_invitations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_invitations_create";
import { generate_random_erp_hrm_member_organizations_roles_create } from "../../../generate/generate_random_erp_hrm_member_organizations_roles_create";
import { prepare_random_erp_hrm_invitation } from "../../../prepare/prepare_random_erp_hrm_invitation";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_invitation_create_direct_add_existing_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register member A (the organization owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      email: memberAEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAAuthorized);
  // Step 2: Create a new organization with member A as Owner
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberAConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Create a custom role within the organization
  const customRole =
    await generate_random_erp_hrm_member_organizations_roles_create(
      memberAConnection,
      {
        params: {
          organizationId: organization.id,
        },
        body: {
          name: `custom-role-${RandomGenerator.alphaNumeric(8)}`,
          permissions: ["employee:view"],
        },
      },
    );
  typia.assert(customRole);
  // Step 4: Register member B as a separate platform account
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {
      email: memberBEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberBAuthorized);
  // Step 5: Using member A's connection, invite member B (direct-add flow)
  const invitation =
    await generate_random_erp_hrm_member_organizations_invitations_create(
      memberAConnection,
      {
        params: {
          organizationId: organization.id,
        },
        body: {
          email: memberBEmail,
          roleId: customRole.id,
          employmentType: "contractor",
        },
      },
    );
  typia.assert(invitation);
  // Business Logic Validations
  // Confirm status is 'accepted' — direct-add path
  TestValidator.equals(
    "invitation status is accepted",
    invitation.status,
    "accepted",
  );
  // Confirm memberId is not null and equals member B's platform account UUID
  TestValidator.predicate("memberId is not null", invitation.memberId !== null);
  TestValidator.equals(
    "memberId matches member B's account UUID",
    invitation.memberId,
    memberBAuthorized.member.id,
  );
  // Confirm email matches member B's registered email
  TestValidator.equals(
    "invitation email matches member B's email",
    invitation.email,
    memberBEmail,
  );
  // Confirm organization.id matches the created organization UUID
  TestValidator.equals(
    "organization id matches",
    invitation.organization.id,
    organization.id,
  );
}
