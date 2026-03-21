import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_admin_employees_contracts_create } from "../../../generate/generate_random_erp_hrm_admin_employees_contracts_create";
import { generate_random_erp_hrm_member_invitations_create } from "../../../generate/generate_random_erp_hrm_member_invitations_create";
import { prepare_random_erp_hrm_contract } from "../../../prepare/prepare_random_erp_hrm_contract";
import { prepare_random_erp_hrm_invitation } from "../../../prepare/prepare_random_erp_hrm_invitation";

export async function test_api_contract_creation_first_contract(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authenticates with employee:manage permission
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.ILogin,
  });
  // 2. Member joins the system - store password for later login
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberJoinConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberJoinConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmMember.IJoin,
  });
  // 3. Member logs in
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmMember.ILogin,
  });
  // 4. Create invitation to add member to organization (creates employee record)
  const invitation = await generate_random_erp_hrm_member_invitations_create(
    memberConnection,
    {
      body: {
        email: memberEmail,
      } satisfies IErpHrmInvitation.ICreate,
    },
  );
  typia.assert(invitation);
  // 5. Admin creates contract for the employee
  const contract = await api.functional.erpHrm.admin.employees.contracts.create(
    adminConnection,
    {
      employeeId: invitation.id,
      body: {
        start_date: new Date().toISOString(),
        pay_rate: 5000,
        pay_period: "monthly",
        working_hours_per_week: 40,
        notes: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IErpHrmContract.ICreate,
    },
  );
  typia.assert(contract);
  // 6. Validate contract details
  TestValidator.predicate(
    "contract has valid UUID",
    /^\{?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}?$/i.test(
      contract.id,
    ),
  );
  TestValidator.equals("pay_rate matches", contract.pay_rate, 5000);
  TestValidator.equals("pay_period matches", contract.pay_period, "monthly");
  TestValidator.equals(
    "working_hours_per_week matches",
    contract.working_hours_per_week,
    40,
  );
  TestValidator.equals(
    "end_date is null (active contract)",
    contract.end_date,
    null,
  );
  TestValidator.equals(
    "employee id matches invitation",
    contract.employee.id,
    invitation.id,
  );
}
