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

export async function test_api_invitation_retrieve_pending_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a pending invitation with a new unique email address
  const uniqueEmail = typia.random<string & tags.Format<"email">>();
  const invitation = await generate_random_erp_hrm_member_invitations_create(
    memberConnection,
    {
      body: {
        email: uniqueEmail,
      },
    },
  );
  typia.assert(invitation);
  // 3. Retrieve the invitation by its UUID
  const retrievedInvitation = await api.functional.erpHrm.member.invitations.at(
    memberConnection,
    {
      invitationId: invitation.id,
    },
  );
  typia.assert(retrievedInvitation);
  // 4. Validate response details
  TestValidator.equals(
    "invitation ID matches",
    retrievedInvitation.id,
    invitation.id,
  );
  TestValidator.equals("email matches", retrievedInvitation.email, uniqueEmail);
  TestValidator.equals(
    "status is pending",
    retrievedInvitation.status,
    "pending",
  );
  TestValidator.predicate(
    "organization present",
    !!retrievedInvitation.organization,
  );
  TestValidator.predicate(
    "created_at exists",
    !!retrievedInvitation.created_at,
  );
  TestValidator.predicate(
    "updated_at exists",
    !!retrievedInvitation.updated_at,
  );
}
