import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeContract";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_employee_contract_retrieve_history_entry(
  connection: api.IConnection,
): Promise<void> {
  const memberSeed = RandomGenerator.alphaNumeric(8);
  const joined = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: `employee-${memberSeed}@test.com` as string &
          tags.Format<"email">,
        password: `P@ssw0rd-${memberSeed}!` as string & tags.Format<"password">,
        displayName: RandomGenerator.name(),
        avatarImageUrl: null,
        phoneNumber: null,
        href: "https://example.com/erpHrmTime/onboarding",
        referrer: "https://example.com/",
        ip: "127.0.0.1",
      } satisfies IErpHrmTimeMember.IJoin,
    },
  );
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: joined.token.access,
    },
  };
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const employeeContractId = typia.random<string & tags.Format<"uuid">>();
  const contract =
    await api.functional.erpHrmTime.member.employees.contracts.at(
      memberConnection,
      {
        employeeId,
        employeeContractId,
      },
    );
  typia.assert(contract);
  TestValidator.equals("contract id", contract.id, employeeContractId);
  TestValidator.equals(
    "employee reference",
    contract.employee,
    contract.employee,
  );
  TestValidator.predicate("start date exists", contract.startDate.length > 0);
  TestValidator.predicate("created at exists", contract.createdAt.length > 0);
  TestValidator.predicate("updated at exists", contract.updatedAt.length > 0);
  TestValidator.predicate(
    "deleted at is nullable",
    contract.deletedAt === null || contract.deletedAt.length > 0,
  );
  const secondJoined = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: `employee-${memberSeed}-other@test.com` as string &
          tags.Format<"email">,
        password: `P@ssw0rd-${memberSeed}-other!` as string &
          tags.Format<"password">,
        displayName: RandomGenerator.name(),
        avatarImageUrl: null,
        phoneNumber: null,
        href: "https://example.com/erpHrmTime/onboarding/other",
        referrer: "https://example.com/",
        ip: "127.0.0.1",
      } satisfies IErpHrmTimeMember.IJoin,
    },
  );
  const otherConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: secondJoined.token.access,
    },
  };
  await TestValidator.httpError(
    "cross-organization contract access should be rejected when no matching employee context exists",
    [400, 401, 403, 404],
    async () => {
      await api.functional.erpHrmTime.member.employees.contracts.at(
        otherConnection,
        {
          employeeId,
          employeeContractId,
        },
      );
    },
  );
}
