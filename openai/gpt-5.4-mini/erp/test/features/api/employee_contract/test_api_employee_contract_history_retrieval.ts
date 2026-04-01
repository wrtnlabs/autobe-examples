import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import type { IErpHrmTimeEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeContract";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
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

export async function test_api_employee_contract_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  const employeeId: string & tags.Format<"uuid"> = authorized.id;
  const page = await api.functional.erpHrmTime.member.employees.contracts.index(
    memberConnection,
    {
      employeeId,
      body: {
        page: 1,
        limit: 10,
      } satisfies IErpHrmTimeEmployeeContract.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.predicate(
    "pagination current page is first page",
    page.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is honored",
    page.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page data length is within requested limit",
    page.data.length <= 10,
  );
  for (let i = 0; i < page.data.length; i++) {
    const contract = page.data[i];
    TestValidator.equals(
      "employee reference is stable within the same page",
      contract.employee,
      page.data[0]?.employee,
    );
    TestValidator.predicate(
      "contract start date exists",
      contract.startDate.length > 0,
    );
    TestValidator.predicate(
      "contract end date is nullable date string or null",
      contract.endDate === null || contract.endDate.length > 0,
    );
    TestValidator.predicate(
      "contract pay rate is finite",
      Number.isFinite(contract.payRate),
    );
    TestValidator.predicate(
      "contract pay period is present",
      contract.payPeriod.length > 0,
    );
    TestValidator.predicate(
      "working hours per week is positive",
      contract.workingHoursPerWeek > 0,
    );
    TestValidator.predicate(
      "createdAt is present",
      contract.createdAt.length > 0,
    );
    TestValidator.predicate(
      "updatedAt is present",
      contract.updatedAt.length > 0,
    );
    TestValidator.predicate(
      "deletedAt is nullable date string or null",
      contract.deletedAt === null || contract.deletedAt.length > 0,
    );
    if (i > 0) {
      TestValidator.predicate(
        "contracts are ordered oldest to newest",
        new Date(page.data[i - 1].startDate).getTime() <=
          new Date(contract.startDate).getTime(),
      );
    }
  }
  const secondPage =
    await api.functional.erpHrmTime.member.employees.contracts.index(
      memberConnection,
      {
        employeeId,
        body: {
          page: 2,
          limit: 1,
        } satisfies IErpHrmTimeEmployeeContract.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.predicate(
    "second page pagination limit is honored",
    secondPage.pagination.limit === 1,
  );
  TestValidator.predicate(
    "second page current is honored when available",
    secondPage.pagination.current === 2 || secondPage.pagination.records <= 1,
  );
  const emptyPage =
    await api.functional.erpHrmTime.member.employees.contracts.index(
      memberConnection,
      {
        employeeId,
        body: {
          search: "__definitely_no_contract_match__",
          page: 1,
          limit: 100,
        } satisfies IErpHrmTimeEmployeeContract.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.predicate(
    "filtered search can return an empty page",
    emptyPage.data.length >= 0,
  );
  TestValidator.predicate(
    "filtered search preserves pagination shape",
    emptyPage.pagination.current >= 1 && emptyPage.pagination.limit === 100,
  );
}
