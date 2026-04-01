import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import type { IErpHrmTimeEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeContract";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_employees_contracts_create } from "../../../generate/generate_random_erp_hrm_time_member_employees_contracts_create";
import { prepare_random_erp_hrm_time_employee_contract } from "../../../prepare/prepare_random_erp_hrm_time_employee_contract";

export async function test_api_employee_contract_authorization_and_organization_scope(
  connection: api.IConnection,
): Promise<void> {
  const makeJoinBody = (email: string): IErpHrmTimeMember.IJoin => ({
    email,
    password: "Password123!",
    name: RandomGenerator.name(),
    href: "https://example.com/erp-join",
    referrer: "https://example.com/referrer",
  });
  const authorizedSeedConnection: api.IConnection = { host: connection.host };
  const authorizedAuth = await authorize_member_join(authorizedSeedConnection, {
    body: makeJoinBody(`owner.${RandomGenerator.alphaNumeric(8)}@test.com`),
  });
  typia.assert(authorizedAuth);
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${authorizedAuth.token.access}` },
  };
  const limitedSeedConnection: api.IConnection = { host: connection.host };
  const limitedAuth = await authorize_member_join(limitedSeedConnection, {
    body: makeJoinBody(`limited.${RandomGenerator.alphaNumeric(8)}@test.com`),
  });
  typia.assert(limitedAuth);
  const limitedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${limitedAuth.token.access}` },
  };
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const contractId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "limited member cannot update employee contract",
    async () => {
      await api.functional.erpHrmTime.member.employees.contracts.update(
        limitedConnection,
        {
          employeeId,
          contractId,
          body: {
            notes: "unauthorized update attempt",
          } satisfies IErpHrmTimeEmployeeContract.IUpdate,
        },
      );
    },
  );
  await TestValidator.error(
    "unauthorized connection cannot access employee contract update",
    async () => {
      await api.functional.erpHrmTime.member.employees.contracts.update(
        { host: connection.host },
        {
          employeeId,
          contractId,
          body: {
            notes: "cross organization attempt",
          } satisfies IErpHrmTimeEmployeeContract.IUpdate,
        },
      );
    },
  );
  await TestValidator.error(
    "authorized member cannot update a random non-existent contract without matching scoped resources",
    async () => {
      await api.functional.erpHrmTime.member.employees.contracts.update(
        authorizedConnection,
        {
          employeeId,
          contractId,
          body: {
            notes: "missing resource attempt",
          } satisfies IErpHrmTimeEmployeeContract.IUpdate,
        },
      );
    },
  );
}
