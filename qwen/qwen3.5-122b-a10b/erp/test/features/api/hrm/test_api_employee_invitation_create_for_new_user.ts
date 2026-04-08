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

export async function test_api_employee_invitation_create_for_new_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member with employee:manage permission
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(memberAuth);
  // 2. Create an employee invitation with a unique email (new user)
  const invitedEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const invitation: IHrmEmployeeInvitation =
    await generate_random_hrm_member_invitations_create(memberConnection, {
      body: {
        email: invitedEmail,
      },
    });
  typia.assert(invitation);
  // 3. Validate invitation response structure
  TestValidator.equals(
    "invitation status is pending",
    invitation.status,
    "pending",
  );
  TestValidator.equals(
    "invitation email matches input",
    invitation.email,
    invitedEmail,
  );
  TestValidator.predicate(
    "invitation token is non-empty",
    invitation.token.length > 0,
  );
  TestValidator.predicate(
    "invitation expires_at is valid datetime",
    new Date(invitation.expires_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "invitation organization is populated",
    invitation.organization !== null && invitation.organization !== undefined,
  );
  TestValidator.predicate(
    "invitation role is populated",
    invitation.role !== null && invitation.role !== undefined,
  );
  TestValidator.predicate(
    "invitation inviter is populated",
    invitation.inviter !== null && invitation.inviter !== undefined,
  );
  TestValidator.predicate(
    "invitation member is null (pending)",
    invitation.member === null || invitation.member === undefined,
  );
}
