import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_invitations_create } from "../../../generate/generate_random_erp_hrm_member_invitations_create";
import { prepare_random_erp_hrm_invitation } from "../../../prepare/prepare_random_erp_hrm_invitation";

export async function test_api_invitation_creation_for_new_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member who has employee:manage permission to create invitations
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create an invitation for a NEW email address that doesn't exist in the system
  const newEmail = typia.random<string & tags.Format<"email">>();
  const invitation = await api.functional.erpHrm.member.invitations.create(
    memberConnection,
    {
      body: {
        email: newEmail,
      } satisfies IErpHrmInvitation.ICreate,
    },
  );
  typia.assert(invitation);
  // 3. Validate response includes invitation ID, email, status='pending', token, and organization context
  TestValidator.equals(
    "invitation has UUID id",
    invitation.id.length > 0,
    true,
  );
  TestValidator.equals("email matches input", invitation.email, newEmail);
  TestValidator.equals("status is pending", invitation.status, "pending");
  TestValidator.predicate(
    "token exists for invitation link",
    invitation.token !== null && invitation.token.length > 0,
  );
  TestValidator.predicate(
    "organization context exists",
    invitation.organization !== null &&
      invitation.organization.id !== undefined,
  );
  // 4. Confirm no employee record was created at this stage (since user hasn't registered yet)
  TestValidator.equals(
    "accepted_at is null for pending invitation",
    invitation.accepted_at,
    null,
  );
  // 5. Validate organization context details
  TestValidator.equals(
    "organization has UUID id",
    invitation.organization.id.length > 0,
    true,
  );
  TestValidator.predicate(
    "organization has name",
    invitation.organization.name !== undefined &&
      invitation.organization.name.length > 0,
  );
}
