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

export async function test_api_invitation_pending_for_new_user(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member who will be the organization owner
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 2: Create an organization - built-in roles are created automatically
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Prepare invitation data
  const invitationEmail = typia.random<string & tags.Format<"email">>();
  const roleId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Create an invitation for a new email address
  const invitation =
    await api.functional.erpHrm.member.organizations.invitations.create(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          email: invitationEmail,
          roleId: roleId,
        } satisfies IErpHrmInvitation.ICreate,
      },
    );
  typia.assert(invitation);
  // Step 5: Validate invitation response
  TestValidator.equals(
    "invitation status is pending",
    invitation.status,
    "pending",
  );
  TestValidator.equals(
    "invitation email matches",
    invitation.email,
    invitationEmail,
  );
  TestValidator.equals(
    "organization ID matches",
    invitation.organization.id,
    organization.id,
  );
  TestValidator.predicate("deleted_at is null", invitation.deleted_at === null);
  TestValidator.predicate(
    "created_at is set",
    invitation.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is set",
    invitation.updated_at.length > 0,
  );
}
