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
import { generate_random_erp_hrm_member_erp_hrm_organizations_invitations_create } from "../../../generate/generate_random_erp_hrm_member_erp_hrm_organizations_invitations_create";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { prepare_random_erp_hrm_invitation } from "../../../prepare/prepare_random_erp_hrm_invitation";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";

export async function test_api_invitation_duplicate_pending_invitation_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates account and organization
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass123!",
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Admin sets organization context
  const adminOrgContext =
    await generate_random_erp_hrm_member_organization_context_select(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(adminOrgContext);
  // 3. Member creates account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "MemberPass123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Member joins organization (switch context to admin's org)
  await api.functional.erpHrm.member.organization_context.select(
    memberConnection,
    {
      body: {
        organizationId: adminOrgContext.organization.id,
      } satisfies IErpHrmOrganizationContext.ICreate,
    },
  );
  // 5. Create first invitation (should succeed)
  const inviteEmail = typia.random<string & tags.Format<"email">>();
  const firstInvitation =
    await generate_random_erp_hrm_member_erp_hrm_organizations_invitations_create(
      memberConnection,
      {
        params: {
          organizationId: adminOrgContext.organization.id,
        },
        body: {
          email: inviteEmail,
          position: "Software Engineer",
          note: "Welcome to our team!",
        },
      },
    );
  typia.assert(firstInvitation);
  // 6. Attempt to create duplicate invitation (should return 409 Conflict)
  await TestValidator.error(
    "duplicate pending invitation should return 409 Conflict",
    async () => {
      await api.functional.erpHrm.member.erpHrm.organizations.invitations.create(
        memberConnection,
        {
          organizationId: adminOrgContext.organization.id,
          body: {
            email: inviteEmail,
            position: "Product Manager",
            note: "Different position",
          } satisfies IErpHrmInvitation.ICreate,
        },
      );
    },
  );
}
