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

export async function test_api_invitation_creation_for_existing_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create the target member account that will receive the invitation
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {});
  typia.assert(member2);
  // 2. Create inviter member (member1) who will send the invitation
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {});
  typia.assert(member1);
  // 3. Send invitation to the existing member's email
  const invitation = await api.functional.erpHrm.member.invitations.create(
    member1Connection,
    {
      body: {
        email: member2.email,
      } satisfies IErpHrmInvitation.ICreate,
    },
  );
  typia.assert(invitation);
  // 4. Validate that invitation is immediately accepted for existing user
  TestValidator.equals("invitation status", invitation.status, "accepted");
  TestValidator.predicate(
    "has accepted_at timestamp",
    invitation.accepted_at !== null,
  );
  // 5. Validate employee record was created (organization and role are present)
  TestValidator.predicate(
    "has organization context",
    invitation.organization !== null && invitation.organization !== undefined,
  );
  TestValidator.predicate(
    "has role assigned",
    invitation.role !== null && invitation.role !== undefined,
  );
}