import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeInvitation";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_employees_invitations_create } from "../../../generate/generate_random_erp_hrm_time_member_employees_invitations_create";
import { prepare_random_erp_hrm_time_employee_invitation } from "../../../prepare/prepare_random_erp_hrm_time_employee_invitation";

export async function test_api_employee_invitation_existing_account_attachment(
  connection: api.IConnection,
): Promise<void> {
  const inviteeEmail: string = typia.random<string & tags.Format<"email">>();
  const inviteePassword = "1234!Aa";
  const inviteeConnection: api.IConnection = { host: connection.host };
  const inviteeAuthorized = await authorize_member_join(inviteeConnection, {
    body: {
      email: inviteeEmail,
      password: inviteePassword,
      name: RandomGenerator.name(),
      href: "https://example.com/register/invitee",
      referrer: "https://example.com/landing/invitee",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(inviteeAuthorized);
  const inviterEmail: string = typia.random<string & tags.Format<"email">>();
  const inviterConnection: api.IConnection = { host: connection.host };
  const inviterAuthorized = await authorize_member_join(inviterConnection, {
    body: {
      email: inviterEmail,
      password: "1234!Aa",
      name: RandomGenerator.name(),
      href: "https://example.com/register/inviter",
      referrer: "https://example.com/landing/inviter",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(inviterAuthorized);
  const inviterScopedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: inviterAuthorized.token.access,
    },
  };
  const firstInvitation =
    await generate_random_erp_hrm_time_member_employees_invitations_create(
      inviterScopedConnection,
      {
        body: {
          email: inviteeEmail,
        } satisfies IErpHrmTimeEmployeeInvitation.ICreate,
      },
    );
  typia.assert(firstInvitation);
  TestValidator.equals(
    "invited email should match the existing account email",
    firstInvitation.email,
    inviteeEmail,
  );
  TestValidator.predicate(
    "existing account should be attached to the current organization",
    firstInvitation.member !== null,
  );
  const repeatInvitation =
    await generate_random_erp_hrm_time_member_employees_invitations_create(
      inviterScopedConnection,
      {
        body: {
          email: inviteeEmail,
        } satisfies IErpHrmTimeEmployeeInvitation.ICreate,
      },
    );
  typia.assert(repeatInvitation);
  TestValidator.equals(
    "repeated invitation email should match the existing account email",
    repeatInvitation.email,
    inviteeEmail,
  );
  TestValidator.predicate(
    "repeated invitation should also attach the existing account",
    repeatInvitation.member !== null,
  );
  TestValidator.equals(
    "repeated invitation should resolve to the same linked member in the same organization",
    repeatInvitation.member,
    firstInvitation.member,
  );
  const secondOrgEmail: string = typia.random<string & tags.Format<"email">>();
  const secondOrgConnection: api.IConnection = { host: connection.host };
  const secondOrgAuthorized = await authorize_member_join(secondOrgConnection, {
    body: {
      email: secondOrgEmail,
      password: "1234!Aa",
      name: RandomGenerator.name(),
      href: "https://example.com/register/second-org",
      referrer: "https://example.com/landing/second-org",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(secondOrgAuthorized);
  const secondOrgScopedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: secondOrgAuthorized.token.access,
    },
  };
  const secondOrgInvitation =
    await generate_random_erp_hrm_time_member_employees_invitations_create(
      secondOrgScopedConnection,
      {
        body: {
          email: inviteeEmail,
        } satisfies IErpHrmTimeEmployeeInvitation.ICreate,
      },
    );
  typia.assert(secondOrgInvitation);
  TestValidator.equals(
    "second organization invitation should keep the same invited email",
    secondOrgInvitation.email,
    inviteeEmail,
  );
  TestValidator.predicate(
    "second organization should also attach the existing account",
    secondOrgInvitation.member !== null,
  );
  TestValidator.equals(
    "organization-scoped invitation should still reference the invited account",
    secondOrgInvitation.member,
    firstInvitation.member,
  );
}
