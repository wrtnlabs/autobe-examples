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

export async function test_api_employee_invitation_pending_email(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const localPart = RandomGenerator.alphabets(12);
  const pendingEmail = `${localPart}@example.com` as string &
    tags.Format<"email">;
  const first =
    await generate_random_erp_hrm_time_member_employees_invitations_create(
      memberConnection,
      {
        body: {
          email: pendingEmail,
        },
      },
    );
  typia.assert(first);
  TestValidator.equals("invited email", first.email, pendingEmail);
  TestValidator.equals(
    "no member attached for pending invite",
    first.member,
    null,
  );
  const second =
    await generate_random_erp_hrm_time_member_employees_invitations_create(
      memberConnection,
      {
        body: {
          email: pendingEmail,
        },
      },
    );
  typia.assert(second);
  TestValidator.equals(
    "duplicate invitation keeps same email",
    second.email,
    pendingEmail,
  );
  TestValidator.equals(
    "duplicate invitation still has no member",
    second.member,
    null,
  );
}
