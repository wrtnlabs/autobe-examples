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

export async function test_api_invitation_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member with employee:manage permission
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // 2. Create a new connection with the member's token for invitation operations
  const inviterConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  // 3. Generate a random email for the invitation
  const duplicateEmail = typia.random<string & tags.Format<"email">>();
  // 4. Create the first invitation successfully
  const firstInvitation =
    await generate_random_erp_hrm_member_invitations_create(inviterConnection, {
      body: {
        email: duplicateEmail,
        position: "Software Engineer",
        note: "Welcome to our team!",
      },
    });
  typia.assert(firstInvitation);
  // 5. Attempt to create a duplicate invitation with the same email
  // This should be rejected with a 409 Conflict error
  await TestValidator.httpError(
    "duplicate invitation rejected",
    409,
    async () => {
      await generate_random_erp_hrm_member_invitations_create(
        inviterConnection,
        {
          body: {
            email: duplicateEmail,
            position: "Product Manager",
            note: "Another invitation attempt",
          },
        },
      );
    },
  );
}
