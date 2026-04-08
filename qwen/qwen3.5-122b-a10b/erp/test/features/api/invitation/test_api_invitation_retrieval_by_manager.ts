import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeInvitation";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_invitations_create } from "../../../generate/generate_random_hrm_member_invitations_create";
import { prepare_random_hrm_employee_invitation } from "../../../prepare/prepare_random_hrm_employee_invitation";

export async function test_api_invitation_retrieval_by_manager(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member with Manager role
  const managerConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create an employee invitation (utility handles role selection)
  const invitation = await generate_random_hrm_member_invitations_create(
    managerConnection,
    {},
  );
  typia.assert(invitation);
  // 3. Retrieve the invitation by ID
  const retrieved = await api.functional.hrm.member.invitations.at(
    managerConnection,
    {
      invitationId: invitation.id,
    },
  );
  typia.assert(retrieved);
  // 4. Validate invitation details
  TestValidator.equals("invitation ID matches", retrieved.id, invitation.id);
  TestValidator.equals("email matches", retrieved.email, invitation.email);
  TestValidator.equals("status is pending", retrieved.status, "pending");
  TestValidator.equals("token matches", retrieved.token, invitation.token);
  TestValidator.equals(
    "expiration timestamp matches",
    retrieved.expires_at,
    invitation.expires_at,
  );
  TestValidator.equals(
    "organization ID matches",
    retrieved.organization.id,
    invitation.organization.id,
  );
  TestValidator.equals(
    "role ID matches",
    retrieved.role.id,
    invitation.role.id,
  );
  TestValidator.equals(
    "inviter ID matches",
    retrieved.inviter.id,
    invitation.inviter.id,
  );
}
