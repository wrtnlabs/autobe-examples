import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeEmployeeContractHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeContractHistory";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_employee_contract_history_view(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const ownHistory =
    await api.functional.erpHrmTime.member.employees.contracts.history(
      memberConnection,
      {
        employeeId: member.id,
      },
    );
  typia.assert(ownHistory);
  TestValidator.predicate(
    "contract history wrapper should expose contracts field",
    ownHistory.contracts === true || ownHistory.contracts === false,
  );
  const ownHistoryAgain =
    await api.functional.erpHrmTime.member.employees.contracts.history(
      memberConnection,
      {
        employeeId: member.id,
      },
    );
  typia.assert(ownHistoryAgain);
  TestValidator.equals(
    "contract history should be stable on repeated reads",
    ownHistory,
    ownHistoryAgain,
  );
  const otherEmployeeId = typia.random<string & tags.Format<"uuid">>();
  if (otherEmployeeId !== member.id) {
    await TestValidator.httpError(
      "access to another employee contract history should be denied or not found",
      [401, 403, 404],
      async () => {
        await api.functional.erpHrmTime.member.employees.contracts.history(
          memberConnection,
          {
            employeeId: otherEmployeeId,
          },
        );
      },
    );
  }
}
