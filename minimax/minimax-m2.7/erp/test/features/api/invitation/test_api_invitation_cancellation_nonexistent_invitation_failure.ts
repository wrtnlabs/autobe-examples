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

export async function test_api_invitation_cancellation_nonexistent_invitation_failure(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member with employee:manage permission
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create first pending invitation for email1@example.com in the current organization
  const invitation1 = await generate_random_erp_hrm_member_invitations_create(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
      } satisfies IErpHrmInvitation.ICreate,
    },
  );
  typia.assert(invitation1);
  // 3. Create another pending invitation for email2@example.com in the same organization
  const invitation2 = await generate_random_erp_hrm_member_invitations_create(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
      } satisfies IErpHrmInvitation.ICreate,
    },
  );
  typia.assert(invitation2);
  // 4. Attempt to delete using an invalid/non-existent UUID format
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // 5. Verify HTTP 404 Not Found response is returned
  await TestValidator.httpError(
    "canceling non-existent invitation returns 404",
    404,
    async () => {
      await api.functional.erpHrm.member.invitations.erase(memberConnection, {
        invitationId: nonExistentId,
      });
    },
  );
}
