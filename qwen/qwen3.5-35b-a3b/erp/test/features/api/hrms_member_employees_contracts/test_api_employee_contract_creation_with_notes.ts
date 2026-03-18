import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployeeContract";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_employees_contracts_create } from "../../../generate/generate_random_hrms_member_employees_contracts_create";
import { prepare_random_hrms_employee_contract } from "../../../prepare/prepare_random_hrms_employee_contract";

export async function test_api_employee_contract_creation_with_notes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const authConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    ...connection.headers,
    Authorization: member.token.access,
  };
  // Generate employee ID (would normally be an existing employee)
  const employeeId = crypto.randomUUID();
  // 2. Test contract creation with short notes
  const shortNotes = "Probation period of 3 months.";
  const contract1 = await api.functional.hrms.member.employees.contracts.create(
    memberConnection,
    {
      employeeId,
      body: {
        start_date: new Date().toISOString(),
        pay_rate: 5000,
        pay_period: "monthly",
        working_hours_per_week: 40,
        notes: shortNotes,
      },
    },
  );
  typia.assert(contract1);
  TestValidator.equals(
    "short notes stored correctly",
    contract1.notes,
    shortNotes,
  );
  // 3. Test contract creation with medium notes
  const mediumNotes = RandomGenerator.paragraph({ sentences: 3 });
  const contract2 = await api.functional.hrms.member.employees.contracts.create(
    memberConnection,
    {
      employeeId,
      body: {
        start_date: new Date().toISOString(),
        pay_rate: 6000,
        pay_period: "monthly",
        working_hours_per_week: 40,
        notes: mediumNotes,
      },
    },
  );
  typia.assert(contract2);
  TestValidator.equals(
    "medium notes stored correctly",
    contract2.notes,
    mediumNotes,
  );
  // 4. Test contract creation with long notes
  const longNotes = RandomGenerator.content({ paragraphs: 2 });
  const contract3 = await api.functional.hrms.member.employees.contracts.create(
    memberConnection,
    {
      employeeId,
      body: {
        start_date: new Date().toISOString(),
        pay_rate: 7000,
        pay_period: "monthly",
        working_hours_per_week: 40,
        notes: longNotes,
      },
    },
  );
  typia.assert(contract3);
  TestValidator.equals(
    "long notes stored correctly",
    contract3.notes,
    longNotes,
  );
  // 5. Test contract creation without notes (null)
  const contract4 = await api.functional.hrms.member.employees.contracts.create(
    memberConnection,
    {
      employeeId,
      body: {
        start_date: new Date().toISOString(),
        pay_rate: 8000,
        pay_period: "monthly",
        working_hours_per_week: 40,
        notes: null,
      },
    },
  );
  typia.assert(contract4);
  TestValidator.equals("null notes handled correctly", contract4.notes, null);
  // 6. Test contract creation without notes (undefined/omitted)
  const contract5 = await api.functional.hrms.member.employees.contracts.create(
    memberConnection,
    {
      employeeId,
      body: {
        start_date: new Date().toISOString(),
        pay_rate: 9000,
        pay_period: "monthly",
        working_hours_per_week: 40,
      },
    },
  );
  typia.assert(contract5);
  TestValidator.equals(
    "omitted notes handled correctly",
    contract5.notes,
    null,
  );
  // 7. Test special characters and unicode in notes
  const specialNotes =
    "Salary adjustment: $50,000 (¥5,500,000 / €45,000) with bonus %20";
  const contract6 = await api.functional.hrms.member.employees.contracts.create(
    memberConnection,
    {
      employeeId,
      body: {
        start_date: new Date().toISOString(),
        pay_rate: 10000,
        pay_period: "monthly",
        working_hours_per_week: 40,
        notes: specialNotes,
      },
    },
  );
  typia.assert(contract6);
  TestValidator.equals(
    "special characters stored correctly",
    contract6.notes,
    specialNotes,
  );
}