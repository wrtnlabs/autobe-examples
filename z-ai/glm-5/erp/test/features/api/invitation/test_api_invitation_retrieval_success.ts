import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
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
import { prepare_random_erp_hrm_invitation } from "../../../prepare/prepare_random_erp_hrm_invitation";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

/**
 * Test successful retrieval of invitation details by an authenticated member.
 *
 * This test validates the GET /erpHrm/member/organizations/{organizationId}/invitations/{invitationId}
 * endpoint for retrieving a specific invitation within an organization.
 *
 * Steps:
 * 1. Create a member account and authenticate (creates first organization per spec)
 * 2. Create a new organization (for explicit control)
 * 3. Create an invitation within the organization
 * 4. Retrieve the invitation by ID
 * 5. Validate all response properties match expected values
 */
export async function test_api_invitation_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(authorizedMember);
  // Step 2: Create a new organization (member becomes owner)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "America/New_York",
          fiscalStartMonth: 1,
        },
      },
    );
  typia.assert(organization);
  // Step 3: Create an invitation within the organization
  const invitedEmail = typia.random<string & tags.Format<"email">>();
  const invitation =
    await generate_random_erp_hrm_member_organizations_invitations_create(
      memberConnection,
      {
        params: {
          organizationId: organization.id,
        },
        body: {
          email: invitedEmail,
        },
      },
    );
  typia.assert(invitation);
  // Step 4: Retrieve the invitation by ID
  const retrievedInvitation =
    await api.functional.erpHrm.member.organizations.invitations.at(
      memberConnection,
      {
        organizationId: organization.id,
        invitationId: invitation.id,
      },
    );
  typia.assert(retrievedInvitation);
  // Step 5: Validate response properties
  TestValidator.equals(
    "invitation id matches",
    retrievedInvitation.id,
    invitation.id,
  );
  TestValidator.equals(
    "email matches",
    retrievedInvitation.email,
    invitedEmail,
  );
  TestValidator.equals(
    "status is pending",
    retrievedInvitation.status,
    "pending",
  );
  TestValidator.equals(
    "organization id matches",
    retrievedInvitation.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "organization name matches",
    retrievedInvitation.organization.name,
    organization.name,
  );
  TestValidator.predicate(
    "created_at exists",
    retrievedInvitation.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedInvitation.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null",
    retrievedInvitation.deleted_at,
    null,
  );
  // Validate role information exists
  TestValidator.predicate(
    "role id exists",
    retrievedInvitation.role.id.length > 0,
  );
  TestValidator.predicate(
    "role name exists",
    retrievedInvitation.role.name.length > 0,
  );
}
