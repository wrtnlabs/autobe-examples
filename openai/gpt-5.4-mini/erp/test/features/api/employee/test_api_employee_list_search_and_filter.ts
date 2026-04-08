import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeEmployeeDashboardSummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_employee_list_search_and_filter(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email:
        `employee-search-${RandomGenerator.alphaNumeric(8)}@test.com` as string &
          tags.Format<"email">,
      password: `Password-${RandomGenerator.alphaNumeric(12)}!` as string &
        tags.Format<"password">,
      displayName: `Search Owner ${RandomGenerator.name(2)}`,
      href: "https://example.com/onboarding",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const firstPage = await api.functional.erpHrmTime.member.employees.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IErpHrmTimeEmployeeDashboardSummary.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.predicate(
    "pagination current page is first page",
    firstPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is preserved",
    firstPage.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination metadata is valid",
    firstPage.pagination.records >= 0 && firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "response data does not exceed requested limit",
    firstPage.data.length <= 20,
  );
  const allData = firstPage.data;
  if (allData.length === 0) return;
  const sample = allData[0];
  const sampleName =
    (
      sample.member as {
        displayName?: string;
      }
    ).displayName ?? "";
  const searchTerm =
    sampleName.length > 2
      ? sampleName.slice(0, 2).toLowerCase()
      : sampleName.toLowerCase();
  const filtered = await api.functional.erpHrmTime.member.employees.index(
    memberConnection,
    {
      body: {
        search: searchTerm,
        page: 1,
        limit: 20,
      } satisfies IErpHrmTimeEmployeeDashboardSummary.IRequest,
    },
  );
  typia.assert(filtered);
  TestValidator.predicate(
    "search results are scoped to the active organization",
    filtered.data.every(
      (employee) => employee.organization.id === sample.organization.id,
    ),
  );
  TestValidator.predicate(
    "case-insensitive search matches display name when data exists",
    filtered.data.every((employee) => {
      const displayName = String(
        (
          employee.member as {
            displayName?: string;
          }
        ).displayName ?? "",
      ).toLowerCase();
      return displayName.includes(searchTerm.toLowerCase());
    }),
  );
  TestValidator.predicate(
    "filtered response remains paginated",
    filtered.pagination.current === 1 && filtered.pagination.limit === 20,
  );
  const pageSize = Math.max(1, Math.min(5, allData.length));
  const pageTwo = await api.functional.erpHrmTime.member.employees.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: pageSize,
      } satisfies IErpHrmTimeEmployeeDashboardSummary.IRequest,
    },
  );
  typia.assert(pageTwo);
  TestValidator.predicate(
    "second page pagination advances when more than one page exists",
    pageTwo.pagination.current === 2 || pageTwo.pagination.pages <= 1,
  );
}
