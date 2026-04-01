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

export async function test_api_employee_invitation_permission_and_duplicate_guard(
  connection: api.IConnection,
): Promise<void> {
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(unauthorizedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!",
      name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  await TestValidator.error(
    "member without employee management permission cannot create invitation",
    async () => {
      await api.functional.erpHrmTime.member.employees.invitations.create(
        unauthorizedConnection,
        {
          body: {
            email: typia.random<string & tags.Format<"email">>(),
          } satisfies IErpHrmTimeEmployeeInvitation.ICreate,
        },
      );
    },
  );
  const authorizedConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorizedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!",
      name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const invitedEmail = typia.random<string & tags.Format<"email">>();
  const invitation =
    await api.functional.erpHrmTime.member.employees.invitations.create(
      authorizedConnection,
      {
        body: {
          email: invitedEmail,
        } satisfies IErpHrmTimeEmployeeInvitation.ICreate,
      },
    );
  typia.assert(invitation);
  TestValidator.equals(
    "invited email matches request",
    invitation.email,
    invitedEmail,
  );
  await TestValidator.error(
    "duplicate invitation for same organization-email pair is rejected",
    async () => {
      await api.functional.erpHrmTime.member.employees.invitations.create(
        authorizedConnection,
        {
          body: {
            email: invitedEmail,
          } satisfies IErpHrmTimeEmployeeInvitation.ICreate,
        },
      );
    },
  );
}
