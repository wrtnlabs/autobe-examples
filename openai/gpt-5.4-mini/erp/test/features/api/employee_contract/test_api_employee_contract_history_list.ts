import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeContract";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeEmployeeContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_employee_contract_history_list(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "Passw0rd!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/referrer",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const firstPage =
    await api.functional.erpHrmTime.member.employees.contracts.index(
      memberConnection,
      {
        employeeId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IErpHrmTimeEmployeeContract.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "page number is preserved",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "page limit is preserved",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination metadata matches the response size for the current page",
    firstPage.data.length,
    Math.min(firstPage.pagination.limit, firstPage.pagination.records),
  );
  TestValidator.predicate(
    "contract history is sorted by start date ascending",
    () => {
      for (let index = 1; index < firstPage.data.length; index++) {
        if (
          firstPage.data[index - 1].startDate > firstPage.data[index].startDate
        )
          return false;
      }
      return true;
    },
  );
  const limitedPage =
    await api.functional.erpHrmTime.member.employees.contracts.index(
      memberConnection,
      {
        employeeId,
        body: {
          page: 1,
          limit: 1,
        } satisfies IErpHrmTimeEmployeeContract.IRequest,
      },
    );
  typia.assert(limitedPage);
  TestValidator.equals(
    "limited page number is preserved",
    limitedPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "limited page size is preserved",
    limitedPage.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "limited page returns at most one contract",
    limitedPage.data.length <= 1,
  );
}
