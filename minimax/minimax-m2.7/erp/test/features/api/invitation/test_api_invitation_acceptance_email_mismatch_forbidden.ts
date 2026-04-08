import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationContext";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_admin_organizations_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_create";
import { generate_random_erp_hrm_member_erp_hrm_organizations_invitations_create } from "../../../generate/generate_random_erp_hrm_member_erp_hrm_organizations_invitations_create";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { prepare_random_erp_hrm_invitation } from "../../../prepare/prepare_random_erp_hrm_invitation";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";

export async function test_api_invitation_acceptance_email_mismatch_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin and create organization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      password: adminPassword,
    },
  });
  typia.assert(adminAuth);
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {},
  );
  typia.assert(organization);
  // 2. Set admin organization context
  await generate_random_erp_hrm_member_organization_context_select(
    adminConnection,
    { body: { organizationId: organization.id } },
  );
  // 3. Register member A (invitee) - capture password for later use
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAPassword = RandomGenerator.alphaNumeric(16);
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      password: memberAPassword,
    },
  });
  typia.assert(memberA);
  // 4. Register member B (different email - will try to accept wrong invitation)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBPassword = RandomGenerator.alphaNumeric(16);
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      password: memberBPassword,
    },
  });
  typia.assert(memberB);
  // 5. Send invitation to member A's email
  const invitation =
    await generate_random_erp_hrm_member_erp_hrm_organizations_invitations_create(
      adminConnection,
      {
        body: { email: memberA.email },
        params: { organizationId: organization.id },
      },
    );
  typia.assert(invitation);
  // 6. Login as member B (different email) to get fresh session
  const memberBLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberBLoginConnection, {
    body: {
      email: memberB.email,
      password: memberBPassword,
      href: typia.random<string & tags.Format<"uri">>() satisfies string &
        tags.Format<"uri">,
      referrer: typia.random<string & tags.Format<"uri">>() satisfies string &
        tags.Format<"uri">,
    } satisfies IErpHrmMember.ILogin,
  });
  // 7. Attempt to accept invitation sent to member A's email as member B
  // Expected: 403 Forbidden - authenticated user's email does not match invitation's email
  await TestValidator.httpError(
    "accepting invitation with mismatched email returns 403",
    403,
    async () =>
      await api.functional.erpHrm.member.invitations.accept(
        memberBLoginConnection,
        {
          token: invitation.token!,
        },
      ),
  );
}